-- A coverage-only row (no verdict) must not count as a rating in the bank or the Feedback tab.
create or replace function public.lk_bank_list(p_subject text default null, p_year text default null, p_scope text default 'all')
 returns table(id uuid, title text, title_alt text, language text, language_alt text, subject text, year_group text, minutes integer, approved boolean, shared boolean, mine boolean, rating numeric, rating_count integer, share_token text, created_at timestamptz)
 language sql stable security definer set search_path to 'lektionskollen', 'pg_temp'
as $function$
  with me as (select lektionskollen.current_school() as sid)
  select p.id, p.title, p.body_alt->>'title' as title_alt, p.language, p.language_alt,
         p.subject, p.year_group, p.minutes,
         p.approved, p.shared, (p.school_id = (select sid from me)) as mine,
         round(coalesce(avg(r.score), 0)::numeric, 1) as rating,
         count(r.id)::int as rating_count,
         p.share_token, p.created_at
    from lektionskollen.plans p
    left join lektionskollen.ratings r on r.plan_id = p.id and r.would_reuse is not null
   where (p.school_id = (select sid from me) or p.shared)
     and (p_subject is null or p.subject = p_subject)
     and (p_year    is null or p.year_group = p_year)
     and (p_scope = 'all'
          or (p_scope = 'mine'   and p.school_id = (select sid from me))
          or (p_scope = 'shared' and p.shared))
   group by p.id
   order by p.created_at desc;
$function$;

-- lk_feedback_overview: ratings count now filters `would_reuse is not null`
-- (see the live definition; same body as 20261020c otherwise).
