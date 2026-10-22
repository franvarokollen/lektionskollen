-- Removing a week from a term plan.
--
-- 20261022g deliberately shipped without this, on the grounds that "who may
-- remove someone else's planning" was worth more than a stub. Within an hour
-- of the feature existing I needed it: verifying that generation actually
-- follows the term plan meant writing three fixture weeks into the live
-- window, and there was then no way to take them out again.
--
-- The answer to the question turned out to be the same answer as everywhere
-- else in this schema: the caller's own school, and nothing else. A term plan
-- is departmental, not personal - the head of department who enters it and
-- the coordinator who corrects a typo in it are the same audience, and
-- inventing a second permission level here would be inventing a problem.
--
-- Correcting a week still does not need this: lk_term_plan_save upserts, so
-- re-entering a week overwrites it. This is for a week that should not be
-- there at all - a paste that invented a row, or a fixture like mine.

create or replace function public.lk_term_plan_clear(
  p_subject text, p_year text, p_week int)
returns jsonb
language plpgsql security definer set search_path = lektionskollen, pg_temp as $fn$
declare n int;
begin
  if lektionskollen.current_school() is null then
    return jsonb_build_object('ok', false, 'error', 'no_school');
  end if;
  delete from lektionskollen.term_plan
   where school_id = lektionskollen.current_school()
     and subject = p_subject and year_group = p_year and week = p_week;
  get diagnostics n = row_count;
  return jsonb_build_object('ok', true, 'removed', n);
end; $fn$;

grant execute on function public.lk_term_plan_clear(text, text, int) to anon, authenticated;

-- The fixture rows from verifying the term-plan path. Weeks 40-42 sit in the
-- three-week window lk_term_recent reads, so until these go, every plan
-- generated for Matematik Ak 8 follows on from curriculum nobody taught.
-- Weeks 34-37 are outside the window and harmless, but they are mine too.
delete from lektionskollen.term_plan
 where subject = 'Matematik' and year_group = 'Åk 8'
   and source in ('test', 'paste');
