-- Feedback tab: school-wide feedback overview + tighter review.

-- One row per plan that has any signal (substitute extras, ratings, notes).
create or replace function public.lk_feedback_overview()
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.last_at desc), '[]'::jsonb)
    from (
      select p.id, p.title, p.subject, p.year_group,
             (select count(*)::int from lektionskollen.ratings r
               where r.plan_id = p.id and r.rater_kind = 'vikarie') as ratings,
             (select count(*)::int from lektionskollen.ratings r
               where r.plan_id = p.id and r.rater_kind = 'vikarie' and r.would_reuse) as yes,
             coalesce((select jsonb_agg(jsonb_build_object(
                         'section_ref', h.section_ref, 'section_label', h.section_label,
                         'kind', h.kind, 'n', h.n) order by h.n desc)
                from (select section_ref, section_label, kind, count(*)::int as n
                        from lektionskollen.plan_extras
                       where plan_id = p.id and created_by_kind = 'vikarie'
                       group by 1,2,3) h), '[]'::jsonb) as heat,
             public.lk_plan_feedback(p.id) as feedback,
             greatest(
               (select max(created_at) from lektionskollen.ratings where plan_id = p.id and rater_kind = 'vikarie'),
               (select max(created_at) from lektionskollen.plan_extras where plan_id = p.id and created_by_kind = 'vikarie')
             ) as last_at
        from lektionskollen.plans p
       where p.school_id in (select school_id from lektionskollen.members where user_id = auth.uid()
                             union all select lektionskollen.demo_school())
         and (exists (select 1 from lektionskollen.ratings r where r.plan_id = p.id and r.rater_kind = 'vikarie')
              or exists (select 1 from lektionskollen.plan_extras e where e.plan_id = p.id and e.created_by_kind = 'vikarie'))
    ) x;
$$;

-- Same signature as before; now only touches extras in the caller's own school.
create or replace function public.lk_review_extra(p_extra_id bigint, p_kept boolean)
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
begin
  update lektionskollen.plan_extras e
     set reviewed = true, kept = p_kept, reviewed_by = auth.uid(), reviewed_at = now()
    from lektionskollen.plans p
   where e.id = p_extra_id and p.id = e.plan_id
     and p.school_id in (select school_id from lektionskollen.members where user_id = auth.uid()
                         union all select lektionskollen.demo_school());
  return found;
end; $$;

grant execute on function public.lk_feedback_overview()            to anon, authenticated, service_role;
grant execute on function public.lk_review_extra(bigint,boolean)   to anon, authenticated, service_role;
