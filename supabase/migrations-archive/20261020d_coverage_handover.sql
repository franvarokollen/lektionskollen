-- How far did the substitute get? Feeds the note for the regular teacher and the Feedback tab.
alter table lektionskollen.ratings add column if not exists coverage text check (coverage in ('all','part','none'));
alter table lektionskollen.ratings add column if not exists left_off text;

create or replace function public.lk_rate_coverage_by_token(p_token text, p_coverage text, p_left_off text default null)
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare rid bigint;
begin
  if p_coverage not in ('all','part','none') then return false; end if;
  select r.id into rid from lektionskollen.ratings r
    join lektionskollen.plans p on p.id = r.plan_id
   where p.share_token = p_token and p.approved and r.rater_kind = 'vikarie'
   order by r.created_at desc limit 1;
  if rid is null then
    insert into lektionskollen.ratings (plan_id, rater_kind, score, coverage, left_off)
    select p.id, 'vikarie', 3, p_coverage, nullif(btrim(p_left_off), '')
      from lektionskollen.plans p where p.share_token = p_token and p.approved
    returning id into rid;
    return rid is not null;
  end if;
  update lektionskollen.ratings
     set coverage = p_coverage, left_off = nullif(btrim(p_left_off), '')
   where id = rid;
  return true;
end; $$;

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
               'reasons', r.reasons, 'comment', r.comment,
               'coverage', r.coverage, 'left_off', r.left_off, 'at', r.created_at)
             order by r.created_at desc)
        from lektionskollen.ratings r
       where r.plan_id = p_id and (r.comment is not null or r.coverage is not null)), '[]'::jsonb));
$$;

grant execute on function public.lk_rate_coverage_by_token(text,text,text) to anon, authenticated, service_role;
grant execute on function public.lk_plan_feedback(uuid) to anon, authenticated, service_role;
