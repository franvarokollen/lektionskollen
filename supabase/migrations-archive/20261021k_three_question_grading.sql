-- Grading a lesson by what a substitute can actually answer.
--
-- The binary "would you use this again" was free to answer and so ran ~90% yes,
-- which left the ranking with nothing to sort by: confidence became a head count
-- in disguise. Worse, the entry gate wanted two ratings, and a lesson covered
-- once in November is covered once — a plan that worked beautifully sat invisible
-- for months because the class never needed a substitute again.
--
-- Two changes, which belong together.
--
-- 1. THREE QUESTIONS, ONE TAP EACH. Not a number out of ten: a tired person at
--    the end of a hard lesson cannot tell 7 from 8, and four sliders get
--    straight-lined or abandoned. Three concrete choices get answered honestly
--    and give 27 distinguishable outcomes.
--
--      reuse    no / with changes / yes as it is      0.45  what another school is buying
--      clarity  needed work / mostly / completely     0.35  can it be taught cold?
--      timefit  too little / about right / too much   0.20  the commonest practical failure
--
--    Engagement was the obvious fourth and is deliberately absent: it says more
--    about the class than the plan, and it is the tap where people give up.
--
-- 2. APPROVED MEANS AVAILABLE. There is no longer an entry gate. One substitute
--    is enough to grade a plan, so a gate of two admitted almost everything
--    anyway while blocking exactly the rare-but-excellent case it was meant to
--    protect. The bar now only works in the other direction: a plan falls out
--    of the pool once there is evidence against it.
--
-- Small samples are handled by shrinking toward the middle rather than by being
-- banned: a single rave lands near 0.67 rather than 1.00, so it ranks
-- respectably without leapfrogging a plan eight substitutes have praised. As
-- ratings arrive the prior washes out.

alter table lektionskollen.ratings add column if not exists reuse   text
  check (reuse   in ('no', 'changes', 'yes'));
alter table lektionskollen.ratings add column if not exists clarity text
  check (clarity in ('needed', 'mostly', 'complete'));
alter table lektionskollen.ratings add column if not exists timefit text
  check (timefit in ('little', 'right', 'much'));

-- History counts. An old yes/no answer is the first question, answered.
update lektionskollen.ratings
   set reuse = case when would_reuse then 'yes' else 'no' end
 where reuse is null and would_reuse is not null;

-- One rating's quality, 0..1. Unanswered parts are not guessed: the weights of
-- the questions that were answered are renormalised, so a substitute who
-- answers one question is not punished for the two they skipped.
create or replace function public.lk_rating_quality(
  p_reuse text, p_clarity text, p_timefit text)
returns numeric language sql immutable as $$
  with w as (
    select * from (values
      (case p_reuse   when 'yes' then 1.0 when 'changes' then 0.5 when 'no' then 0.0 end, 0.45),
      (case p_clarity when 'complete' then 1.0 when 'mostly' then 0.6 when 'needed' then 0.0 end, 0.35),
      -- Both extremes hurt, but running dry with someone else's class is worse
      -- than running over: dead time with a substitute is where lessons go wrong.
      (case p_timefit when 'right' then 1.0 when 'much' then 0.6 when 'little' then 0.3 end, 0.20)
    ) v(val, weight) where val is not null)
  select case when (select sum(weight) from w) is null or (select sum(weight) from w) = 0 then null
         else round((select sum(val * weight) from w) / (select sum(weight) from w), 4) end;
$$;

-- The plan's standing. Shrunk toward 0.5 so one answer counts without dominating,
-- then adjusted by what the substitutes did rather than said.
--
--   quality   shrunk mean of the ratings
--   assists   every rescue is evidence the writing did not land
--   recency   a plan nobody has used in a year is a weaker bet than a fresh one
create or replace function public.lk_plan_score(
  p_n int, p_mean numeric, p_assists int, p_days_since numeric)
returns numeric language sql immutable as $$
  select case when coalesce(p_n, 0) = 0 then null else
    round((
      ((p_n * p_mean + 2 * 0.5) / (p_n + 2))
      * (1.0 / (1 + 0.15 * (coalesce(p_assists, 0)::numeric / p_n)))
      * (0.7 + 0.3 * exp(-coalesce(p_days_since, 0) / 120.0))
    )::numeric, 4) end;
$$;

-- Everything the pool decision and the UI need, for one plan.
create or replace function public.lk_plan_standing(p_id uuid)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  with r as (
    select count(*) filter (where public.lk_rating_quality(reuse, clarity, timefit) is not null)::int as n,
           avg(public.lk_rating_quality(reuse, clarity, timefit)) as mean,
           count(*) filter (where reuse = 'yes')::int      as reuse_yes,
           count(*) filter (where reuse = 'changes')::int  as reuse_changes,
           count(*) filter (where reuse = 'no')::int       as reuse_no,
           count(*) filter (where clarity = 'complete')::int as clear_full,
           count(*) filter (where clarity = 'mostly')::int   as clear_most,
           count(*) filter (where clarity = 'needed')::int   as clear_needed,
           count(*) filter (where timefit = 'right')::int    as fit_right,
           count(*) filter (where timefit = 'little')::int   as fit_little,
           count(*) filter (where timefit = 'much')::int     as fit_much,
           extract(epoch from (now() - max(created_at))) / 86400 as days_since
      from lektionskollen.ratings
     where plan_id = p_id and rater_kind = 'vikarie'
  ), a as (
    select count(*)::int as assists,
           coalesce(max(c), 0)::int as worst, max(worst_label) as worst_label
      from (select count(*)::int as c, max(section_label) as worst_label
              from lektionskollen.plan_extras
             where plan_id = p_id and created_by_kind = 'vikarie' and kind = 'explain'
             group by section_ref) x
  )
  select jsonb_build_object(
    'n', r.n, 'mean', round(coalesce(r.mean, 0), 4),
    'score', public.lk_plan_score(r.n, r.mean, a.assists, r.days_since),
    'assists', coalesce(a.assists, 0), 'days_since', round(coalesce(r.days_since, 0)),
    'reuse',   jsonb_build_object('yes', r.reuse_yes, 'changes', r.reuse_changes, 'no', r.reuse_no),
    'clarity', jsonb_build_object('complete', r.clear_full, 'mostly', r.clear_most, 'needed', r.clear_needed),
    'timefit', jsonb_build_object('right', r.fit_right, 'little', r.fit_little, 'much', r.fit_much),
    'worst_explains', coalesce(a.worst, 0), 'worst_label', a.worst_label,
    'burnt', coalesce(a.worst, 0) >= 3)
    from r, a;
$$;

-- Approved means available. The pool is left only on evidence: three or more
-- ratings averaging badly, or one section rescued three times.
create or replace function lektionskollen.should_share(p_id uuid)
returns boolean language sql stable
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce((select approved from lektionskollen.plans where id = p_id), false)
     and not coalesce((s->>'burnt')::boolean, false)
     and not (coalesce((s->>'n')::int, 0) >= 3 and coalesce((s->>'score')::numeric, 1) < 0.40)
    from (select public.lk_plan_standing(p_id) as s) q;
$$;

-- Approval now puts a plan in the pool, so the decision has to run then too.
create or replace function lektionskollen.apply_threshold()
returns trigger language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
begin
  update lektionskollen.plans p
     set shared = lektionskollen.should_share(new.plan_id)
   where p.id = new.plan_id and p.approved;
  return new;
end; $$;

create or replace function lektionskollen.share_on_approve()
returns trigger language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
begin
  if new.approved and not coalesce(old.approved, false) then
    new.shared := lektionskollen.should_share(new.id);
  end if;
  return new;
end; $$;

-- create or replace, so applying this twice needs no drop.
create or replace trigger share_on_approve before update on lektionskollen.plans
for each row execute function lektionskollen.share_on_approve();

update lektionskollen.plans p set shared = lektionskollen.should_share(p.id) where p.approved;

-- The substitute's three answers live in lk_rate_aspects_by_token, which gains
-- a session id in the next migration so one substitute cannot overwrite another.

grant execute on function public.lk_rating_quality(text,text,text)            to anon, authenticated, service_role;
grant execute on function public.lk_plan_score(int,numeric,int,numeric)       to anon, authenticated, service_role;
grant execute on function public.lk_plan_standing(uuid)                       to anon, authenticated, service_role;
