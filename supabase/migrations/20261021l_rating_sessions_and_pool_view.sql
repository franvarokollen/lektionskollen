-- One rating per substitute, and a bank that shows where plans came from.

-- The three questions save as they are tapped, so the second tap has to find
-- the row the first one made. Keyed on the plan alone it found the PREVIOUS
-- substitute's row and overwrote their answers — which would have quietly
-- capped every plan at one rating, the exact opposite of letting a pool of
-- substitutes move a plan up or down over time.
--
-- The browser keeps a random id per share link, so one substitute's three
-- answers land in one row and the next substitute gets their own.
alter table lektionskollen.ratings add column if not exists rater_session text;

create unique index if not exists ratings_one_per_session
  on lektionskollen.ratings (plan_id, rater_session) where rater_session is not null;

create or replace function public.lk_rate_aspects_by_token(
  p_token text, p_session text, p_reuse text default null,
  p_clarity text default null, p_timefit text default null)
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare pid uuid;
begin
  select id into pid from lektionskollen.plans where share_token = p_token and approved;
  if pid is null or coalesce(btrim(p_session), '') = '' then return false; end if;

  insert into lektionskollen.ratings (plan_id, rater_kind, rater_session, score, reuse, clarity, timefit, would_reuse)
  values (pid, 'vikarie', p_session, 3, p_reuse, p_clarity, p_timefit,
          case when p_reuse is null then null else p_reuse <> 'no' end)
  -- The index is partial, so ON CONFLICT has to name the same predicate.
  on conflict (plan_id, rater_session) where rater_session is not null do update
    set reuse   = coalesce(excluded.reuse, lektionskollen.ratings.reuse),
        clarity = coalesce(excluded.clarity, lektionskollen.ratings.clarity),
        timefit = coalesce(excluded.timefit, lektionskollen.ratings.timefit),
        would_reuse = case
          when coalesce(excluded.reuse, lektionskollen.ratings.reuse) is null then lektionskollen.ratings.would_reuse
          else coalesce(excluded.reuse, lektionskollen.ratings.reuse) <> 'no' end;

  update lektionskollen.plans set shared = lektionskollen.should_share(pid) where id = pid;
  return true;
end; $$;

-- Ranked by the new score, carrying the whole standing so a card can show what
-- the number is made of, and the school so a coordinator knows whose plan this
-- is. The school is joined here rather than inside lk_bank_list, whose row type
-- other callers depend on.
create or replace function public.lk_bank_ranked(
  p_subject text default null, p_year text default null, p_scope text default 'all')
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  with base as (
    select b.*, s.name as school, public.lk_plan_standing(b.id) as st
      from public.lk_bank_list(p_subject, p_year, p_scope) b
      join lektionskollen.plans p on p.id = b.id
      join lektionskollen.schools s on s.id = p.school_id
  ), scored as (
    select s.*,
           (st->>'n')::int            as n_v,
           (st->'reuse'->>'yes')::int as yes_v,
           (st->>'assists')::int      as assists,
           (st->>'score')::numeric    as score,
           (st->>'burnt')::boolean    as burnt,
           ((st->>'n')::int = 0)      as is_new
      from base s
  ), proven as (
    select id, row_number() over (order by score desc nulls last, created_at desc) as i
      from scored where approved and not is_new
  ), fresh as (
    -- Every fifth slot goes to a plan nobody has used yet, so a new plan is
    -- seen rather than buried behind a term of history.
    select id, row_number() over (order by created_at desc) as j
      from scored where is_new and approved
  ), keyed as (
    select s.*,
           case when not s.approved then 1000000
                when s.is_new then 4 * f.j + 0.5
                else p.i end as rk
      from scored s
      left join proven p on p.id = s.id
      left join fresh  f on f.id = s.id
  )
  select coalesce(jsonb_agg(to_jsonb(kd) - 'rk' order by kd.rk), '[]'::jsonb) from keyed kd;
$$;

grant execute on function public.lk_rate_aspects_by_token(text,text,text,text,text) to anon, authenticated, service_role;
grant execute on function public.lk_bank_ranked(text,text,text)                      to anon, authenticated, service_role;
