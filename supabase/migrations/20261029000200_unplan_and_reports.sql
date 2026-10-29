-- Two things the pilot needs before a real school uses it.
--
-- 1. lk_unlog_run: take back a lesson planned by mistake. Lektionskollen on its
--    own plans lessons ahead (Today page, LK #205), so a wrong class or a wrong
--    day has to be fixable. Only the school's own, only today or later, and
--    never once anyone has given feedback on it: by then it happened.
--
-- 2. problem_reports + lk_report: what goes wrong in the browser, from two
--    sources — script errors caught on the page (kind 'error') and the
--    "Report a problem" button (kind 'user'). The browser can only add rows,
--    never read them; read them in the Supabase table editor. Flood-guarded,
--    size-capped, and kept for 180 days.

create or replace function public.lk_unlog_run(p_run_token text)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'lektionskollen', 'pg_temp'
as $function$
declare sid uuid := lektionskollen.current_school(); uid uuid;
begin
  if sid is null or coalesce(p_run_token, '') = '' then return false; end if;
  select u.id into uid from lektionskollen.plan_uses u
   where u.run_token = p_run_token and u.school_id = sid
     and u.used_on >= (now() at time zone 'Europe/Stockholm')::date
     and u.teacher_verdict is null;
  if uid is null then return false; end if;
  if exists (select 1 from lektionskollen.ratings r where r.use_id = uid)
     or exists (select 1 from lektionskollen.section_feedback f where f.use_id = uid) then
    return false;
  end if;
  delete from lektionskollen.plan_uses where id = uid;
  return true;
end; $function$;

revoke all on function public.lk_unlog_run(text) from public, anon, authenticated;
grant execute on function public.lk_unlog_run(text) to anon, authenticated, service_role;


create table if not exists lektionskollen.problem_reports (
  id bigint generated always as identity primary key,
  school_id uuid references lektionskollen.schools(id) on delete cascade,
  kind text not null check (kind in ('user', 'error')),
  message text not null check (length(message) between 1 and 4000),
  page text,
  build text,
  detail jsonb,
  created_at timestamp with time zone default now() not null,
  resolved_at timestamp with time zone
);
create index if not exists problem_reports_recent_idx on lektionskollen.problem_reports (created_at desc);
-- No policies: nobody reads or writes the table directly except through lk_report.
alter table lektionskollen.problem_reports enable row level security;

create or replace function public.lk_report(p_kind text, p_message text, p_page text default null,
                                            p_build text default null, p_detail jsonb default null)
 returns boolean
 language plpgsql
 security definer
 set search_path to 'lektionskollen', 'pg_temp'
as $function$
declare sid uuid := lektionskollen.current_school(); msg text := left(btrim(coalesce(p_message, '')), 4000);
begin
  if p_kind not in ('user', 'error') or msg = '' then return false; end if;
  if p_detail is not null and length(p_detail::text) > 20000 then p_detail := null; end if;
  -- Flood guard: per school (or per anonymous substitute page) and kind, per hour.
  if (select count(*) from lektionskollen.problem_reports
       where school_id is not distinct from sid and kind = p_kind
         and created_at > now() - interval '1 hour')
     >= (case p_kind when 'error' then 50 else 20 end) then
    return false;
  end if;
  -- The same script error over and over is one report.
  if p_kind = 'error' and exists (select 1 from lektionskollen.problem_reports
       where school_id is not distinct from sid and kind = 'error' and message = msg
         and created_at > now() - interval '10 minutes') then
    return true;
  end if;
  insert into lektionskollen.problem_reports (school_id, kind, message, page, build, detail)
  values (sid, p_kind, msg, left(p_page, 300), left(p_build, 40), p_detail);
  -- Kept 180 days; a report can hold whatever a person typed.
  delete from lektionskollen.problem_reports where created_at < now() - interval '180 days';
  return true;
end; $function$;

revoke all on function public.lk_report(text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.lk_report(text, text, text, text, jsonb) to anon, authenticated, service_role;
