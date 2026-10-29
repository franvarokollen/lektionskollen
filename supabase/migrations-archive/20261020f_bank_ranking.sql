-- Bank ranking: good plans rise, plans that keep needing rescue sink, new plans still get seen.
--
--   score = wilson_lower_bound(yes, n)            confidence-adjusted yes-rate (80%)
--         x assist_penalty                        1 / (1 + 0.15 x assists per rating)
--         x recency                               0.7 .. 1.0, half-life ~ 4 months
--         + 0.10 x share of ratings that covered "all of it"
--
-- Only substitute ratings count: they are the people who actually delivered the lesson.
-- Plans with fewer than 5 substitute ratings are "new": one in every five slots goes to a
-- new plan, so a good plan with no ratings yet is not buried forever.

create or replace function public.lk_rank_score(
  p_n int, p_yes int, p_assists int, p_days_since numeric, p_cover_all numeric)
returns numeric language sql immutable as $$
  select case when coalesce(p_n,0) = 0 then null else
    round((
      ( ( (p_yes::numeric / p_n) + 1.6384/(2*p_n)
          - 1.2816 * sqrt( ((p_yes::numeric / p_n) * (1 - p_yes::numeric / p_n) + 1.6384/(4*p_n)) / p_n ) )
        / (1 + 1.6384 / p_n) )
      * (1.0 / (1 + 0.15 * (coalesce(p_assists,0)::numeric / p_n)))
      * (0.7 + 0.3 * exp(-coalesce(p_days_since,0) / 120.0))
      + 0.10 * coalesce(p_cover_all,0)
    )::numeric, 4) end;
$$;

create or replace function public.lk_bank_ranked(
  p_subject text default null, p_year text default null, p_scope text default 'all')
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  with base as (
    select b.*,
      (select count(*)::int from lektionskollen.ratings r
        where r.plan_id = b.id and r.rater_kind = 'vikarie' and r.would_reuse is not null) as n_v,
      (select count(*)::int from lektionskollen.ratings r
        where r.plan_id = b.id and r.rater_kind = 'vikarie' and r.would_reuse) as yes_v,
      (select count(*)::int from lektionskollen.plan_extras e
        where e.plan_id = b.id and e.created_by_kind = 'vikarie') as assists,
      (select extract(epoch from (now() - max(r.created_at))) / 86400 from lektionskollen.ratings r
        where r.plan_id = b.id and r.rater_kind = 'vikarie') as days_since,
      (select coalesce(avg((r.coverage = 'all')::int) filter (where r.coverage is not null), 0)
         from lektionskollen.ratings r where r.plan_id = b.id and r.rater_kind = 'vikarie') as cover_all
    from public.lk_bank_list(p_subject, p_year, p_scope) b
  ), scored as (
    select s.*, public.lk_rank_score(s.n_v, s.yes_v, s.assists, s.days_since, s.cover_all) as score,
           (s.approved and s.n_v < 5) as is_new
      from base s
  ), proven as (
    select id, row_number() over (order by score desc nulls last, created_at desc) as i
      from scored where approved and not is_new
  ), fresh as (
    select id, row_number() over (order by created_at desc) as j
      from scored where is_new
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

grant execute on function public.lk_rank_score(int,int,int,numeric,numeric) to anon, authenticated, service_role;
grant execute on function public.lk_bank_ranked(text,text,text)            to anon, authenticated, service_role;
