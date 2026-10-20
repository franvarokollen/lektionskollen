-- Sharing by confidence, not by a head count. Plus: which class had which plan.
--
-- The old rule was "at least 3 substitute ratings, two thirds of them yes". A plan
-- two substitutes both loved was invisible, which is backwards: that is exactly the
-- plan the next school wants. The count was standing in for confidence, badly.
--
-- Now one number does the job — the Wilson lower bound already used for ranking.
-- It asks: given this many yes votes out of this many, how good is the plan at worst?
-- Few ratings pull the answer down on their own, so no separate count gate is needed.
--
--   2 of 2  -> 0.55  shared        3 of 3 -> 0.65  shared
--   2 of 3  -> 0.32  shared        2 of 4 -> 0.23  not yet
--   1 of 2  -> 0.16  not yet       1 of 1 -> 0.38  (held back by the floor below)
--
-- 0.32 is deliberately the old weakest pass (2 of 3), so nothing that qualified
-- yesterday stops qualifying today. A floor of 2 ratings stays: one person should
-- not be able to push a lesson to every other school on their own.

create or replace function public.lk_share_floor() returns int
  language sql immutable as $$ select 2 $$;
create or replace function public.lk_share_bar() returns numeric
  language sql immutable as $$ select 0.32::numeric $$;

-- Confidence that the plan is good, from substitute yes/no answers alone.
-- Same Wilson lower bound as lk_rank_score, without the ranking adjustments.
create or replace function public.lk_share_confidence(p_n int, p_yes int)
returns numeric language sql immutable as $$
  select case when coalesce(p_n,0) = 0 then null else
    round(( ( (p_yes::numeric / p_n) + 1.6384/(2*p_n)
              - 1.2816 * sqrt( ((p_yes::numeric / p_n) * (1 - p_yes::numeric / p_n)
                                + 1.6384/(4*p_n)) / p_n ) )
            / (1 + 1.6384 / p_n) )::numeric, 4) end;
$$;

-- Everything the sharing decision looks at, for one plan, in one row.
-- The UI reads this to explain itself; apply_threshold reads it to decide.
create or replace function public.lk_share_state(p_id uuid)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  with r as (
    select count(*) filter (where would_reuse is not null)::int as n,
           count(*) filter (where would_reuse)::int             as yes
      from lektionskollen.ratings
     where plan_id = p_id and rater_kind = 'vikarie'
  ), w as (
    select coalesce(max(c), 0)::int as worst, max(section_label) as worst_label
      from (select section_ref, max(section_label) as section_label, count(*)::int as c
              from lektionskollen.plan_extras
             where plan_id = p_id and created_by_kind = 'vikarie' and kind = 'explain'
             group by section_ref) x
  )
  select jsonb_build_object(
    'approved',   (select approved from lektionskollen.plans where id = p_id),
    'shared',     (select shared   from lektionskollen.plans where id = p_id),
    'n',          r.n,
    'yes',        r.yes,
    'floor',      public.lk_share_floor(),
    'confidence', public.lk_share_confidence(r.n, r.yes),
    'bar',        public.lk_share_bar(),
    'worst_explains', w.worst,
    'worst_label',    w.worst_label,
    'burnt',      (w.worst >= 3))
    from r, w;
$$;

-- One rule, used by the trigger on ratings and by the backfill below.
create or replace function lektionskollen.should_share(p_id uuid)
returns boolean language sql stable
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce((s->>'approved')::boolean, false)
     and coalesce((s->>'n')::int, 0) >= public.lk_share_floor()
     and coalesce((s->>'confidence')::numeric, 0) >= public.lk_share_bar()
     and not coalesce((s->>'burnt')::boolean, false)
    from (select public.lk_share_state(p_id) as s) q;
$$;

create or replace function lektionskollen.apply_threshold()
returns trigger language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
begin
  update lektionskollen.plans p
     set shared = lektionskollen.should_share(new.plan_id)
   where p.id = new.plan_id and p.approved;
  return new;
end; $$;

-- The demotion trigger now goes through the same rule, so a plan that earns its
-- way back (the weak section rewritten, fresh ratings) is not stuck out forever.
create or replace function lektionskollen.demote_on_repeat_assist()
returns trigger language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
begin
  if new.created_by_kind <> 'vikarie' or new.kind <> 'explain' then return new; end if;
  update lektionskollen.plans set shared = lektionskollen.should_share(new.plan_id)
   where id = new.plan_id;
  return new;
end; $$;

-- Re-decide every approved plan under the new rule.
update lektionskollen.plans p
   set shared = lektionskollen.should_share(p.id)
 where p.approved;

-- ── Which class had which plan ────────────────────────────────
-- A lesson that lands well is worth reusing — with a different class. Without
-- this table nothing stops 7A getting the same fractions lesson in September and
-- again in November, which is the fastest way to lose a substitute's credibility.
--
-- Staff and class group only. No pupil is named here, and none ever should be.
create table if not exists lektionskollen.plan_uses (
  id         uuid primary key default gen_random_uuid(),
  plan_id    uuid not null references lektionskollen.plans(id) on delete cascade,
  school_id  uuid not null references lektionskollen.schools(id) on delete cascade,
  group_name text not null,
  used_on    date not null default current_date,
  absence_ref text,
  substitute text,
  created_at timestamptz not null default now()
);

create unique index if not exists plan_uses_once_per_day
  on lektionskollen.plan_uses (plan_id, group_name, used_on);
create index if not exists plan_uses_group_idx
  on lektionskollen.plan_uses (school_id, group_name, used_on desc);

alter table lektionskollen.plan_uses enable row level security;

-- Record that this plan went to this class today. Idempotent per class per day,
-- so pressing approve twice does not invent a second lesson.
create or replace function public.lk_log_use(
  p_plan_id uuid, p_group text, p_absence_ref text default null,
  p_substitute text default null, p_on date default current_date)
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare sid uuid;
begin
  if coalesce(btrim(p_group), '') = '' then return false; end if;
  select school_id into sid from lektionskollen.plans where id = p_plan_id;
  if sid is null then return false; end if;
  insert into lektionskollen.plan_uses (plan_id, school_id, group_name, used_on, absence_ref, substitute)
  values (p_plan_id, sid, btrim(p_group), p_on, p_absence_ref, nullif(btrim(p_substitute), ''))
  on conflict (plan_id, group_name, used_on) do nothing;
  return true;
end; $$;

-- Every use this school can see, newest first. Small enough to hold in the client,
-- which lets the cover screen and the bank both warn without a round trip each.
create or replace function public.lk_uses()
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'plan_id', u.plan_id, 'group_name', u.group_name,
           'used_on', u.used_on, 'substitute', u.substitute) order by u.used_on desc), '[]'::jsonb)
    from lektionskollen.plan_uses u
   where u.school_id = lektionskollen.current_school();
$$;

grant execute on function public.lk_share_floor()                        to anon, authenticated, service_role;
grant execute on function public.lk_share_bar()                          to anon, authenticated, service_role;
grant execute on function public.lk_share_confidence(int,int)            to anon, authenticated, service_role;
grant execute on function public.lk_share_state(uuid)                    to anon, authenticated, service_role;
grant execute on function public.lk_log_use(uuid,text,text,text,date)    to anon, authenticated, service_role;
grant execute on function public.lk_uses()                               to anon, authenticated, service_role;
