-- Look a plan up by the cover it was made for.
--
-- Frånvarokollen identifies a lesson by its own cover/absence reference. The
-- request carries that reference, so a plan can be found again from the cover
-- screen without Frånvarokollen storing anything about Lektionskollen beyond it.
-- That keeps the add-on removable: delete this schema and Frånvarokollen still
-- has a cover assignment with nothing dangling off it.

create or replace function public.lk_plan_for_cover(p_absence_ref text)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(to_jsonb(x), 'null'::jsonb) from (
    select p.id, p.title, p.subject, p.year_group, p.minutes,
           p.approved, p.shared, p.share_token, p.language, p.created_at
      from lektionskollen.plans p
      join lektionskollen.requests r on r.id = p.request_id
     where r.absence_ref = p_absence_ref
       and p.school_id in (select school_id from lektionskollen.members where user_id = auth.uid()
                           union all select lektionskollen.demo_school())
     order by p.created_at desc
     limit 1) x;
$$;

grant execute on function public.lk_plan_for_cover(text) to anon, authenticated, service_role;
