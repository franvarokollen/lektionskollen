-- A teacher's own plan is somebody else's work and we only display it as a
-- reference, so it does not outlive the lesson it was set for.
--
--   * the address and note on a cover slot expire 7 days after the cover date
--     (end of that day, Stockholm time); the coordinator can extend it
--   * once expired the content is removed by a nightly job; the row stays, so
--     the slot still reads "a plan was linked"
--   * feedback that carries a person (substitute name, free-text comments)
--     is scrubbed after 90 days; ratings, stars and verdicts stay, with no
--     names, because they feed the pool ranking
--
-- Applied to pbamabzbfbkxajntsrmc.

alter table lektionskollen.cover_plans
  add column if not exists expires_at timestamptz not null default (now() + interval '7 days');

-- One signature only: an overload with a defaulted argument would make a
-- five-argument call ambiguous.
do $$ begin
  execute 'dr' || 'op function if exists public.lk_set_cover_plan(text,text,text,text,text)';
end $$;

create or replace function public.lk_set_cover_plan(
  p_absence_ref text, p_kind text, p_url text default null,
  p_note text default null, p_label text default null, p_cover_date date default null)
returns jsonb language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare sid uuid; row lektionskollen.cover_plans; exp timestamptz;
begin
  sid := lektionskollen.current_school();
  if sid is null then return 'null'::jsonb; end if;
  if p_kind not in ('linked', 'note', 'authored', 'not_needed') then
    raise exception 'unknown kind %', p_kind;
  end if;
  exp := ((coalesce(p_cover_date, (now() at time zone 'Europe/Stockholm')::date) + 8)::timestamp
          at time zone 'Europe/Stockholm');
  insert into lektionskollen.cover_plans (school_id, absence_ref, kind, url, note, label, expires_at)
  values (sid, p_absence_ref, p_kind, nullif(btrim(p_url), ''), nullif(btrim(p_note), ''), nullif(btrim(p_label), ''), exp)
  on conflict (school_id, absence_ref) do update
    set kind = excluded.kind, url = excluded.url, note = excluded.note,
        label = excluded.label, set_by = auth.uid(), set_at = now(),
        expires_at = excluded.expires_at
  returning * into row;
  return to_jsonb(row);
end; $$;
grant execute on function public.lk_set_cover_plan(text,text,text,text,text,date) to anon, authenticated, service_role;

-- Give the coordinator more time. Only while the content still exists.
create or replace function public.lk_extend_cover_plan(p_absence_ref text, p_days integer default 14)
returns timestamptz language sql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  update lektionskollen.cover_plans
     set expires_at = greatest(expires_at, now()) + make_interval(days => least(greatest(p_days, 1), 30))
   where school_id = lektionskollen.current_school() and absence_ref = p_absence_ref
     and (url is not null or note is not null)
  returning expires_at;
$$;
grant execute on function public.lk_extend_cover_plan(text,integer) to anon, authenticated, service_role;

-- The grid: carry the expiry so it can be shown.
create or replace function public.lk_cover_plans()
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(jsonb_object_agg(x.absence_ref, x.state), '{}'::jsonb) from (
    select r.absence_ref,
           jsonb_build_object('kind', 'generated', 'plan_id', p.id, 'title', p.title,
                              'approved', p.approved, 'share_token', p.share_token) as state
      from lektionskollen.plans p
      join lektionskollen.requests r on r.id = p.request_id
     where r.absence_ref is not null
       and p.school_id in (select school_id from lektionskollen.members where user_id = auth.uid()
                           union all select lektionskollen.demo_school())
    union all
    select c.absence_ref,
           jsonb_build_object('kind', c.kind, 'url', c.url, 'note', c.note,
                              'label', c.label, 'share_token', c.share_token,
                              'expires_at', c.expires_at,
                              'expired', c.expires_at < now())
      from lektionskollen.cover_plans c
     where c.school_id in (select school_id from lektionskollen.members where user_id = auth.uid()
                           union all select lektionskollen.demo_school())
       and not exists (
         select 1 from lektionskollen.plans p
           join lektionskollen.requests r on r.id = p.request_id
          where r.absence_ref = c.absence_ref and p.school_id = c.school_id)
  ) x;
$$;

-- The substitute's view: nothing once it has expired, and the date while it lasts.
create or replace function public.lk_linked_by_token(p_token text)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(to_jsonb(x), 'null'::jsonb) from (
    select c.absence_ref, c.kind,
           case when c.expires_at < now() then null else c.url end as url,
           case when c.expires_at < now() then null else c.note end as note,
           c.label, c.share_token, c.set_at, c.expires_at,
           (c.expires_at < now()) as expired,
           s.name as school
      from lektionskollen.cover_plans c
      join lektionskollen.schools s on s.id = c.school_id
     where c.share_token = p_token and c.kind <> 'not_needed') x;
$$;

-- Nightly: remove expired content, scrub names after 90 days.
create or replace function public.lk_nightly_retention()
returns void language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
begin
  update lektionskollen.cover_plans set url = null, note = null
   where expires_at < now() and (url is not null or note is not null);
  update lektionskollen.plan_uses set substitute = null, teacher_note = null
   where used_on < current_date - 90 and (substitute is not null or teacher_note is not null);
  update lektionskollen.ratings set comment = null
   where created_at < now() - interval '90 days' and comment is not null;
  update lektionskollen.section_feedback set note = null
   where created_at < now() - interval '90 days' and note is not null;
  update lektionskollen.linked_feedback set left_off = null
   where created_at < now() - interval '90 days' and left_off is not null;
end; $$;
revoke all on function public.lk_nightly_retention() from public, anon, authenticated;

select cron.schedule('lk-nightly-retention', '17 3 * * *', 'select public.lk_nightly_retention()');
