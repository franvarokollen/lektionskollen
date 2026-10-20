-- Two fixes, applied to pbamabzbfbkxajntsrmc.
--
-- 1. An extra was stored in whichever language the substitute happened to be
--    reading and then shown to everyone. The same mistake the plan bodies
--    made. Both languages now ride on the row, as plans already do.
-- 2. Free text, in the two places it is worth asking for it.

alter table lektionskollen.plan_extras add column if not exists body_alt jsonb;
alter table lektionskollen.plan_extras add column if not exists language_alt text;

-- Asked at the moment it was needed, not at the end of the lesson: a
-- substitute who just pressed "explain another way" on phase 2 knows exactly
-- what confused the class. An hour later they write "it was ok".
alter table lektionskollen.plan_extras add column if not exists note text;

create or replace function public.lk_assist_save(
  p_token text, p_section_ref text, p_section_label text, p_kind text,
  p_variant text, p_language text, p_body jsonb, p_model text default null,
  p_body_alt jsonb default null, p_language_alt text default null
) returns jsonb language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare pid uuid; left_today int; row_id bigint;
begin
  select id into pid from lektionskollen.plans where share_token = p_token and approved;
  if pid is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  left_today := lektionskollen.assist_quota_left(pid);
  if left_today <= 0 then return jsonb_build_object('ok', false, 'error', 'quota'); end if;

  insert into lektionskollen.plan_extras
    (plan_id, section_ref, section_label, kind, variant, language, body,
     body_alt, language_alt, created_by_kind, model)
  values
    (pid, coalesce(nullif(p_section_ref,''),'lesson'), nullif(p_section_label,''),
     p_kind, nullif(p_variant,''), coalesce(nullif(p_language,''),'sv'), p_body,
     p_body_alt, nullif(p_language_alt,''), 'vikarie', nullif(p_model,''))
  returning id into row_id;

  return jsonb_build_object('ok', true, 'id', row_id, 'quota_left', left_today - 1);
end; $$;

create or replace function public.lk_extras_by_token(p_token text)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb)
    from (select e.id, e.section_ref, e.section_label, e.kind, e.variant,
                 e.language, e.body, e.body_alt, e.language_alt,
                 e.reviewed, e.kept, e.created_at
            from lektionskollen.plan_extras e
            join lektionskollen.plans p on p.id = e.plan_id
           where p.share_token = p_token and p.approved) x;
$$;

create or replace function public.lk_extras(p_id uuid)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
    from (select e.id, e.plan_id, e.section_ref, e.section_label, e.kind, e.variant,
                 e.language, e.body, e.body_alt, e.language_alt,
                 e.reviewed, e.kept, e.created_by_kind, e.created_at,
                 p.title, p.subject, p.year_group
            from lektionskollen.plan_extras e
            join lektionskollen.plans p on p.id = e.plan_id
           where (p_id is null or e.plan_id = p_id)
             and p.school_id in (select school_id from lektionskollen.members where user_id = auth.uid()
                                 union all select lektionskollen.demo_school())) x;
$$;

create or replace function public.lk_extra_note(p_token text, p_extra_id bigint, p_note text)
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare n int;
begin
  update lektionskollen.plan_extras e
     set note = nullif(btrim(p_note), '')
    from lektionskollen.plans p
   where e.id = p_extra_id and p.id = e.plan_id
     and p.share_token = p_token and p.approved;
  get diagnostics n = row_count;
  return n > 0;
end; $$;

-- ratings.comment existed and was never written to. This fills it.
create or replace function public.lk_rate_comment_by_token(p_token text, p_comment text)
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare rid bigint;
begin
  select r.id into rid from lektionskollen.ratings r
    join lektionskollen.plans p on p.id = r.plan_id
   where p.share_token = p_token and r.rater_kind = 'vikarie'
   order by r.created_at desc limit 1;
  if rid is null then return false; end if;
  update lektionskollen.ratings set comment = nullif(btrim(p_comment), '') where id = rid;
  return true;
end; $$;

-- Every piece of free text on a plan, with the section it came from. What a
-- coordinator reads to fix a plan - and what a model would read later to
-- rewrite the weak phase itself.
create or replace function public.lk_plan_feedback(p_id uuid)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select jsonb_build_object(
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
               'section_ref', e.section_ref, 'section_label', e.section_label,
               'kind', e.kind, 'note', e.note, 'at', e.created_at)
             order by e.created_at desc)
        from lektionskollen.plan_extras e
       where e.plan_id = p_id and e.note is not null), '[]'::jsonb),
    'comments', coalesce((
      select jsonb_agg(jsonb_build_object(
               'rater_kind', r.rater_kind, 'would_reuse', r.would_reuse,
               'reasons', r.reasons, 'comment', r.comment, 'at', r.created_at)
             order by r.created_at desc)
        from lektionskollen.ratings r
       where r.plan_id = p_id and r.comment is not null), '[]'::jsonb));
$$;

grant execute on function public.lk_assist_save(text,text,text,text,text,text,jsonb,text,jsonb,text) to anon, authenticated, service_role;
grant execute on function public.lk_extra_note(text,bigint,text)     to anon, authenticated, service_role;
grant execute on function public.lk_rate_comment_by_token(text,text) to anon, authenticated, service_role;
grant execute on function public.lk_plan_feedback(uuid)              to anon, authenticated, service_role;
