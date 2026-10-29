-- Simpler grading from the substitute: Good / OK / Bad per step, five stars for
-- the lesson, and "would you use it again". The per-step grades and the stars
-- feed the plan's standing alongside the old questions.

-- Steps: good / ok / bad, plus skipped (not a grade, so it is not scored).
alter table lektionskollen.section_feedback drop constraint if exists section_feedback_verdict_check;
alter table lektionskollen.section_feedback
  add constraint section_feedback_verdict_check check (verdict in ('good', 'ok', 'bad', 'skipped'));

alter table lektionskollen.ratings add column if not exists stars int check (stars between 1 and 5);

-- Saving a step also makes sure the substitute has a rating row, so their
-- step grades count towards the plan even if they never touch the stars.
create or replace function public.lk_rate_section_by_token(
  p_token text, p_session text, p_ref text, p_label text,
  p_verdict text default null, p_note text default null)
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare pid uuid; v text := nullif(btrim(p_verdict), ''); n text := nullif(btrim(p_note), '');
begin
  select id into pid from lektionskollen.plans where share_token = p_token and approved;
  if pid is null or coalesce(btrim(p_session), '') = '' or coalesce(btrim(p_ref), '') = '' then return false; end if;
  if v is not null and v not in ('good', 'ok', 'bad', 'skipped') then return false; end if;
  if v is null and n is null then return false; end if;

  insert into lektionskollen.section_feedback (plan_id, rater_session, section_ref, section_label, verdict, note)
  values (pid, left(p_session, 80), left(p_ref, 40), left(p_label, 120), coalesce(v, 'ok'), left(n, 400))
  on conflict (plan_id, rater_session, section_ref) do update
    set verdict = coalesce(v, lektionskollen.section_feedback.verdict),
        note    = coalesce(left(n, 400), lektionskollen.section_feedback.note),
        section_label = coalesce(left(p_label, 120), lektionskollen.section_feedback.section_label),
        updated_at = now();

  insert into lektionskollen.ratings (plan_id, rater_kind, rater_session, score)
  values (pid, 'vikarie', left(p_session, 80), 3)
  on conflict (plan_id, rater_session) where rater_session is not null do nothing;
  return true;
end; $$;

create or replace function public.lk_rate_stars_by_token(p_token text, p_session text, p_stars int)
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare pid uuid;
begin
  select id into pid from lektionskollen.plans where share_token = p_token and approved;
  if pid is null or coalesce(btrim(p_session), '') = '' or p_stars is null or p_stars not between 1 and 5 then return false; end if;
  insert into lektionskollen.ratings (plan_id, rater_kind, rater_session, score, stars)
  values (pid, 'vikarie', left(p_session, 80), p_stars, p_stars)
  on conflict (plan_id, rater_session) where rater_session is not null do update
    set stars = excluded.stars;
  return true;
end; $$;

-- One rating's quality, 0..1. Weights of unanswered parts drop out and the
-- rest are renormalised, so nobody is punished for what they skipped.
--   reuse .35, stars .30, steps .20, clarity .10, time fit .05
-- (clarity and time fit are no longer asked; older ratings keep theirs.)
create or replace function public.lk_rating_quality2(
  p_reuse text, p_clarity text, p_timefit text, p_stars int, p_steps numeric)
returns numeric language sql immutable as $$
  with w as (
    select * from (values
      (case p_reuse when 'yes' then 1.0 when 'changes' then 0.5 when 'no' then 0.0 end, 0.35),
      ((p_stars - 1) / 4.0, 0.30),
      (p_steps, 0.20),
      (case p_clarity when 'complete' then 1.0 when 'mostly' then 0.6 when 'needed' then 0.0 end, 0.10),
      (case p_timefit when 'right' then 1.0 when 'much' then 0.6 when 'little' then 0.3 end, 0.05)
    ) v(val, weight) where val is not null)
  select case when (select sum(weight) from w) is null or (select sum(weight) from w) = 0 then null
         else round((select sum(val * weight) from w) / (select sum(weight) from w), 4) end;
$$;

create or replace function public.lk_plan_standing(p_id uuid)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  with rq as (
    select rt.*,
           (select avg(case f.verdict when 'good' then 1.0 when 'ok' then 0.5 when 'bad' then 0.0 end)
              from lektionskollen.section_feedback f
             where f.plan_id = rt.plan_id and f.rater_session = rt.rater_session) as steps
      from lektionskollen.ratings rt
     where rt.plan_id = p_id and rt.rater_kind = 'vikarie'
  ), r as (
    select count(*) filter (where public.lk_rating_quality2(reuse, clarity, timefit, stars, steps) is not null)::int as n,
           avg(public.lk_rating_quality2(reuse, clarity, timefit, stars, steps)) as mean,
           count(*) filter (where reuse = 'yes')::int      as reuse_yes,
           count(*) filter (where reuse = 'changes')::int  as reuse_changes,
           count(*) filter (where reuse = 'no')::int       as reuse_no,
           count(*) filter (where clarity = 'complete')::int as clear_full,
           count(*) filter (where clarity = 'mostly')::int   as clear_most,
           count(*) filter (where clarity = 'needed')::int   as clear_needed,
           count(*) filter (where timefit = 'right')::int    as fit_right,
           count(*) filter (where timefit = 'little')::int   as fit_little,
           count(*) filter (where timefit = 'much')::int     as fit_much,
           count(stars)::int as stars_n, round(avg(stars), 1) as stars_avg,
           extract(epoch from (now() - max(created_at))) / 86400 as days_since
      from rq
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
    'stars', jsonb_build_object('n', r.stars_n, 'avg', r.stars_avg),
    'worst_explains', coalesce(a.worst, 0), 'worst_label', a.worst_label,
    'burnt', coalesce(a.worst, 0) >= 3)
    from r, a;
$$;

-- Coordinator view: counts per grade for each step.
create or replace function public.lk_section_feedback(p_id uuid)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(jsonb_agg(to_jsonb(s) order by s.section_ref), '[]'::jsonb)
    from (
      select f.section_ref,
             max(f.section_label) as section_label,
             count(*) filter (where f.verdict = 'good')::int    as good,
             count(*) filter (where f.verdict = 'ok')::int      as ok,
             count(*) filter (where f.verdict = 'bad')::int     as bad,
             count(*) filter (where f.verdict = 'skipped')::int as skipped,
             coalesce(jsonb_agg(f.note order by f.updated_at desc) filter (where f.note is not null), '[]'::jsonb) as notes
        from lektionskollen.section_feedback f
       where f.plan_id = p_id
       group by f.section_ref) s;
$$;

grant execute on function public.lk_rate_section_by_token(text,text,text,text,text,text) to anon, authenticated, service_role;
grant execute on function public.lk_rate_stars_by_token(text,text,int) to anon, authenticated, service_role;
grant execute on function public.lk_rating_quality2(text,text,text,int,numeric) to anon, authenticated, service_role;
grant execute on function public.lk_plan_standing(uuid) to anon, authenticated, service_role;
grant execute on function public.lk_section_feedback(uuid) to authenticated, service_role;
