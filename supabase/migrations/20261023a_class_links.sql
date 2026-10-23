-- One link per class, not one per plan.
--
-- The same plan is often taught to two or three classes in a day. A link per
-- plan made the second class overwrite the first one's feedback, and left no
-- way to say that a lesson worked in 8B and failed in 8C. Each delivery
-- (plan_uses: plan + class + day) now has its own substitute link, which shows
-- the class and time at the top of the plan and expires, and every piece of
-- feedback saved through it is tied to that delivery.

alter table lektionskollen.plan_uses add column if not exists lesson_time text;
alter table lektionskollen.plan_uses add column if not exists run_token text;
alter table lektionskollen.plan_uses add column if not exists expires_at timestamptz;

update lektionskollen.plan_uses set run_token = encode(gen_random_bytes(9), 'hex') where run_token is null;
alter table lektionskollen.plan_uses alter column run_token set default encode(gen_random_bytes(9), 'hex');
create unique index if not exists plan_uses_run_token on lektionskollen.plan_uses (run_token);

-- The link works on the day and the day after (feedback is often given the
-- next morning), then stops.
update lektionskollen.plan_uses
   set expires_at = ((used_on + 2)::timestamp at time zone 'Europe/Stockholm')
 where expires_at is null;

alter table lektionskollen.ratings          add column if not exists use_id uuid;
alter table lektionskollen.section_feedback add column if not exists use_id uuid;
create index if not exists ratings_use_idx          on lektionskollen.ratings (use_id);
create index if not exists section_feedback_use_idx on lektionskollen.section_feedback (use_id);

-- A class link names its delivery in the session id ("r_<run token>"). This
-- ties the row to that delivery and refuses new feedback once the link expired.
create or replace function lektionskollen.tie_to_run() returns trigger
language plpgsql security definer set search_path to 'lektionskollen', 'pg_temp' as $$
declare u record;
begin
  if new.rater_session is not null and new.rater_session like 'r\_%' then
    select id, expires_at into u from lektionskollen.plan_uses
     where run_token = substr(new.rater_session, 3) and plan_id = new.plan_id;
    if found then
      if u.expires_at is not null and u.expires_at < now() then
        raise exception 'run_expired';
      end if;
      new.use_id := u.id;
    end if;
  end if;
  return new;
end; $$;

drop trigger if exists ratings_tie_to_run on lektionskollen.ratings;
create trigger ratings_tie_to_run before insert on lektionskollen.ratings
  for each row execute function lektionskollen.tie_to_run();
drop trigger if exists section_feedback_tie_to_run on lektionskollen.section_feedback;
create trigger section_feedback_tie_to_run before insert on lektionskollen.section_feedback
  for each row execute function lektionskollen.tie_to_run();

-- Create (or find) this class's delivery and return its link token. Idempotent
-- per plan, class and day, so pressing approve twice gives the same link.
create or replace function public.lk_log_run(
  p_plan_id uuid, p_group text, p_time text default null,
  p_absence_ref text default null, p_substitute text default null, p_on date default current_date)
returns jsonb language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare sid uuid; r record;
begin
  if coalesce(btrim(p_group), '') = '' then return null; end if;
  select school_id into sid from lektionskollen.plans where id = p_plan_id;
  if sid is null then return null; end if;
  insert into lektionskollen.plan_uses
         (plan_id, school_id, group_name, used_on, absence_ref, substitute, lesson_time, expires_at)
  values (p_plan_id, sid, btrim(p_group), p_on, p_absence_ref, nullif(btrim(p_substitute), ''),
          nullif(btrim(p_time), ''), ((p_on + 2)::timestamp at time zone 'Europe/Stockholm'))
  on conflict (plan_id, group_name, used_on) do update
     set lesson_time = coalesce(excluded.lesson_time, lektionskollen.plan_uses.lesson_time),
         substitute  = coalesce(excluded.substitute,  lektionskollen.plan_uses.substitute),
         absence_ref = coalesce(excluded.absence_ref, lektionskollen.plan_uses.absence_ref)
  returning run_token, expires_at into r;
  return jsonb_build_object('run_token', r.run_token, 'expires_at', r.expires_at);
end; $$;

-- What the substitute's page needs to open a class link. Once expired it hands
-- back no plan token, so an old link is a dead end by design, not by the page
-- choosing to hide something.
create or replace function public.lk_run_by_token(p_run text)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce((
    select jsonb_build_object(
      'plan_token', case when u.expires_at is null or u.expires_at >= now() then p.share_token end,
      'group_name', u.group_name, 'used_on', u.used_on, 'lesson_time', u.lesson_time,
      'substitute', u.substitute, 'expires_at', u.expires_at,
      'expired', (u.expires_at is not null and u.expires_at < now()),
      'school', s.name)
    from lektionskollen.plan_uses u
    join lektionskollen.plans p on p.id = u.plan_id
    join lektionskollen.schools s on s.id = u.school_id
   where u.run_token = p_run), 'null'::jsonb);
$$;

-- Per plan, how each class got on. The same plan can be right for 8B and
-- wrong for 8C, and the teacher who owns 8C needs to see only theirs.
create or replace function public.lk_feedback_runs()
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(jsonb_object_agg(x.plan_id, x.runs), '{}'::jsonb) from (
    select u.plan_id, jsonb_agg(jsonb_build_object(
      'group', u.group_name, 'date', u.used_on, 'time', u.lesson_time, 'substitute', u.substitute,
      'teacher', u.teacher_verdict,
      'stars', (select round(avg(r.stars)::numeric, 1) from lektionskollen.ratings r
                 where r.use_id = u.id and r.stars is not null),
      'good', (select count(*) from lektionskollen.section_feedback f where f.use_id = u.id and f.verdict = 'good'),
      'ok',   (select count(*) from lektionskollen.section_feedback f where f.use_id = u.id and f.verdict = 'ok'),
      'bad',  (select count(*) from lektionskollen.section_feedback f where f.use_id = u.id and f.verdict = 'bad'),
      'answered', (exists (select 1 from lektionskollen.ratings r where r.use_id = u.id)
                or exists (select 1 from lektionskollen.section_feedback f where f.use_id = u.id))
    ) order by u.used_on desc, u.created_at desc) runs
      from lektionskollen.plan_uses u
     where u.school_id = lektionskollen.current_school()
     group by u.plan_id) x;
$$;

grant execute on function public.lk_log_run(uuid,text,text,text,text,date) to anon, authenticated, service_role;
grant execute on function public.lk_run_by_token(text)                     to anon, authenticated, service_role;
grant execute on function public.lk_feedback_runs()                        to anon, authenticated, service_role;

-- The cover screen needs each delivery's token to rebuild the class link when a
-- plan is reopened.
create or replace function public.lk_uses()
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'plan_id', u.plan_id, 'group_name', u.group_name,
           'used_on', u.used_on, 'substitute', u.substitute,
           'run_token', u.run_token, 'lesson_time', u.lesson_time) order by u.used_on desc, u.created_at desc), '[]'::jsonb)
    from lektionskollen.plan_uses u
   where u.school_id = lektionskollen.current_school();
$$;
