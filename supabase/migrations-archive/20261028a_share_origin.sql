-- Local by default, shared by choice, and every plan says where it came from.
--
-- A plan always belongs to its school, and its school always sees it. The
-- shared pool — what other schools see — now takes a plan only when it is
-- approved, holds up with substitutes (should_share, unchanged), AND is
-- allowed to be shared:
--
--   origin 'ai'       follows the school's setting "share our approved AI
--                     plans" (on by default), unless the plan says otherwise
--   origin 'teacher'  never shared unless the plan is ticked, one by one —
--                     a teacher's own work leaves the school only by choice
--
-- share_allowed is the per-plan choice: null = follow the rule above.
-- Teacher-made plans arrive with step 2 (upload); the column is ready now so
-- the pool can label and filter both kinds from day one.

alter table lektionskollen.plans
  add column if not exists origin        text not null default 'ai',
  add column if not exists share_allowed boolean,
  add column if not exists author_name   text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'plans_origin_ck') then
    alter table lektionskollen.plans
      add constraint plans_origin_ck check (origin in ('ai', 'teacher'));
  end if;
end $$;

alter table lektionskollen.school_settings
  add column if not exists share_ai boolean not null default true;

-- May this plan leave its school? The choice, not the quality bar.
create or replace function lektionskollen.share_allowed(p_id uuid)
returns boolean language sql stable
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(p.share_allowed,
                  case when p.origin = 'ai' then coalesce(ss.share_ai, true) else false end)
    from lektionskollen.plans p
    left join lektionskollen.school_settings ss on ss.school_id = p.school_id
   where p.id = p_id;
$$;

-- Same bar as before, plus the choice.
create or replace function lektionskollen.should_share(p_id uuid)
returns boolean language sql stable
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce((select approved from lektionskollen.plans where id = p_id), false)
     and coalesce(lektionskollen.share_allowed(p_id), false)
     and not coalesce((s->>'burnt')::boolean, false)
     and not (coalesce((s->>'n')::int, 0) >= 3 and coalesce((s->>'score')::numeric, 1) < 0.40)
     and coalesce((f->>'wrong')::int, 0) = 0
     and coalesce((v->>'ok')::boolean, true)
    from (select public.lk_plan_standing(p_id) as s,
                 public.lk_teacher_flags(p_id) as f,
                 (select public.lk_validate_plan(body, minutes)
                    from lektionskollen.plans where id = p_id) as v) q;
$$;

-- Tick or untick one plan. Only the plan's own school decides.
create or replace function public.lk_set_plan_share(p_id uuid, p_allow boolean)
returns jsonb language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare r jsonb;
begin
  update lektionskollen.plans set share_allowed = p_allow
   where id = p_id and school_id = lektionskollen.current_school();
  if not found then return jsonb_build_object('error', 'not_ours'); end if;
  update lektionskollen.plans set shared = lektionskollen.should_share(id) where id = p_id;
  select jsonb_build_object('share_allowed', lektionskollen.share_allowed(id), 'shared', shared)
    into r from lektionskollen.plans where id = p_id;
  return r;
end; $$;

-- The school-wide rule for AI plans. Re-evaluates every AI plan that follows it.
create or replace function public.lk_set_share_ai(p_on boolean)
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
begin
  insert into lektionskollen.school_settings (school_id, share_ai)
  values (lektionskollen.current_school(), p_on)
  on conflict (school_id) do update set share_ai = excluded.share_ai, updated_at = now();
  update lektionskollen.plans set shared = lektionskollen.should_share(id)
   where school_id = lektionskollen.current_school() and origin = 'ai' and share_allowed is null;
  return true;
end; $$;

create or replace function public.lk_get_settings()
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select jsonb_build_object(
    'assist_cap', coalesce((select assist_cap from lektionskollen.school_settings
                             where school_id = lektionskollen.current_school()), 20),
    'share_ai',   coalesce((select share_ai from lektionskollen.school_settings
                             where school_id = lektionskollen.current_school()), true));
$$;

-- The open plan carries its origin and sharing choice too.
create or replace function public.lk_plan(p_id uuid)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select to_jsonb(x) from (
    select p.id, p.title, p.subject, p.year_group, p.minutes, p.language,
           p.body, p.body_alt, p.language_alt,
           p.approved, p.shared, p.share_token, p.model, p.created_at,
           lektionskollen.approval_label(p.approved_kind, p.approved_qualified) as approved_kind,
           p.approved_subject, p.approved_at, p.approved_name,
           lektionskollen.live_rank(p.approved, p.approved_kind, p.approved_qualified,
                                    p.approved_sha, p.body) as approval_rank,
           (p.approved and p.approved_sha is not null
            and p.approved_sha <> lektionskollen.plan_sha(p.body)) as approval_stale,
           p.check_result, p.checked_at,
           p.origin, p.author_name, p.share_allowed as share_choice,
           lektionskollen.share_allowed(p.id) as share_allowed,
           (p.school_id = lektionskollen.current_school()) as mine
      from lektionskollen.plans p
     where p.id = p_id
       and (p.school_id = lektionskollen.current_school() or p.shared)
  ) x;
$$;

-- The pool, with origin and sharing on every row and an origin filter.
-- Dropped first: a fifth parameter would otherwise sit beside the old one as
-- an overload and make every four-argument call ambiguous.
drop function if exists public.lk_pool(text, text, text, text);
create or replace function public.lk_pool(
  p_subject text default null, p_year text default null,
  p_scope text default 'all', p_approval text default 'any',
  p_origin text default 'any')
returns jsonb
language sql stable security definer set search_path = lektionskollen, pg_temp as $$
  with me as (select lektionskollen.current_school() as sid),
  rows as (
    select p.id, p.title, p.body_alt->>'title' as title_alt, p.language, p.language_alt,
           p.subject, p.year_group, p.minutes,
           p.approved, p.shared, (p.school_id = (select sid from me)) as mine,
           p.origin, p.author_name, lektionskollen.share_allowed(p.id) as share_allowed,
           lektionskollen.approval_label(p.approved_kind, p.approved_qualified) as approved_kind,
           p.approved_subject, p.approved_at, p.approved_name,
           lektionskollen.live_rank(p.approved, p.approved_kind, p.approved_qualified,
                                    p.approved_sha, p.body) as approval_rank,
           (p.approved and p.approved_sha is not null
            and p.approved_sha <> lektionskollen.plan_sha(p.body)) as approval_stale,
           round(coalesce(avg(r.score), 0)::numeric, 1) as rating,
           count(r.id)::int as rating_count,
           p.share_token, p.created_at, s.name as school
      from lektionskollen.plans p
      join lektionskollen.schools s on s.id = p.school_id
      left join lektionskollen.ratings r on r.plan_id = p.id and r.would_reuse is not null
     where (p.school_id = (select sid from me) or p.shared)
       and p.archived_at is null
       and (p_subject is null or p.subject = p_subject)
       and (p_year    is null or p.year_group = p_year)
       and (p_scope = 'all'
            or (p_scope = 'mine'   and p.school_id = (select sid from me))
            or (p_scope = 'shared' and p.shared))
       and (coalesce(p_origin, 'any') = 'any' or p.origin = p_origin)
       and (coalesce(p_approval, 'any') = 'any'
            or (p_approval = 'approved' and p.approved)
            or (p_approval = 'teacher'
                and lektionskollen.live_rank(p.approved, p.approved_kind, p.approved_qualified,
                                             p.approved_sha, p.body) >= 2)
            or (p_approval = 'qualified'
                and lektionskollen.live_rank(p.approved, p.approved_kind, p.approved_qualified,
                                             p.approved_sha, p.body) >= 3))
     group by p.id, s.name
  ), scored as (
    select r.*, public.lk_plan_standing(r.id) as st from rows r
  ), k as (
    select s.*, ((s.st->>'n')::int = 0) as is_new from scored s
  ), proven as (
    select id, row_number() over (
             order by ((st->>'score')::numeric
                       + (case approval_rank when 3 then 0.10 when 2 then 0.05 else 0 end)
                         * 5.0 / (5 + (st->>'n')::int)) desc nulls last,
                      created_at desc) as i
      from k where approved and not is_new
  ), fresh as (
    select id, row_number() over (order by approval_rank desc, created_at desc) as j
      from k where approved and is_new
  ), keyed as (
    select k.*,
           case when not k.approved then 1000000
                when k.is_new then 4 * f.j + 0.5
                else pr.i end as rk
      from k
      left join proven pr on pr.id = k.id
      left join fresh  f  on f.id  = k.id
  )
  select coalesce(jsonb_agg(to_jsonb(x) - 'rk' order by x.rk), '[]'::jsonb) from keyed x;
$$;

grant execute on function public.lk_pool(text, text, text, text, text) to anon, authenticated;
grant execute on function public.lk_set_plan_share(uuid, boolean)     to anon, authenticated;
grant execute on function public.lk_set_share_ai(boolean)             to anon, authenticated;

-- No bulk recompute: every existing plan is AI and the default is on, so the
-- choice changes nothing for them. (A recompute would also flip 18 plans whose
-- stored flag has drifted from should_share — a separate issue, left alone here.)
