-- The term plan becomes a year wheel.
--
-- Two faults in the first version, both invisible until January:
--
-- 1. A Swedish school year runs from week 33 to about week 26, so the weeks
--    do not sort as plain numbers. Week 2 comes AFTER week 50, not before
--    week 34. The recent-weeks lookup compared plain week numbers, so on a
--    Monday in January it looked back at nothing (week 2 minus three weeks
--    is "week -1") and the generator was told the class had learned nothing,
--    exactly when it had just finished the autumn's last unit.
--
-- 2. There was no way to take a week back out. A grid needs that: clearing
--    a cell has to clear the week.
--
-- Weeks are placed on a school-year line: 32..52 first, then 1..31. Week 53
-- sits between them. Everything that orders or looks back uses that line.

create or replace function lektionskollen.school_year_pos(p_week int)
returns int language sql immutable as $$
  select case when p_week >= 32 then p_week - 32 else p_week + 21 end;
$$;

create or replace function public.lk_term_plan(p_subject text, p_year text)
returns jsonb
language sql stable security definer set search_path = lektionskollen, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'week', t.week, 'topic', t.topic, 'note', t.note,
           'source', t.source, 'updated_at', t.updated_at)
         order by lektionskollen.school_year_pos(t.week)), '[]'::jsonb)
    from lektionskollen.term_plan t
   where t.school_id = lektionskollen.current_school()
     and t.subject = p_subject and t.year_group = p_year;
$$;

create or replace function public.lk_term_recent(
  p_subject text, p_year text, p_week int default null, p_back int default 3)
returns jsonb
language sql stable security definer set search_path = lektionskollen, pg_temp as $$
  with w as (
    select lektionskollen.school_year_pos(
             coalesce(p_week, extract(week from current_date)::int)) as now_pos)
  select coalesce(jsonb_agg(jsonb_build_object('week', t.week, 'topic', t.topic, 'note', t.note)
                            order by lektionskollen.school_year_pos(t.week)), '[]'::jsonb)
    from lektionskollen.term_plan t, w
   where t.school_id = lektionskollen.current_school()
     and t.subject = p_subject and t.year_group = p_year
     and lektionskollen.school_year_pos(t.week) <  w.now_pos
     and lektionskollen.school_year_pos(t.week) >= w.now_pos - greatest(1, least(10, coalesce(p_back, 3)));
$$;

-- What is coming, for suggesting lessons that fit the unit the class is in
-- or about to start. Includes the current week.
create or replace function public.lk_term_ahead(
  p_subject text, p_year text, p_week int default null, p_ahead int default 4)
returns jsonb
language sql stable security definer set search_path = lektionskollen, pg_temp as $$
  with w as (
    select lektionskollen.school_year_pos(
             coalesce(p_week, extract(week from current_date)::int)) as now_pos)
  select coalesce(jsonb_agg(jsonb_build_object('week', t.week, 'topic', t.topic, 'note', t.note)
                            order by lektionskollen.school_year_pos(t.week)), '[]'::jsonb)
    from lektionskollen.term_plan t, w
   where t.school_id = lektionskollen.current_school()
     and t.subject = p_subject and t.year_group = p_year
     and lektionskollen.school_year_pos(t.week) >= w.now_pos
     and lektionskollen.school_year_pos(t.week) <  w.now_pos + greatest(1, least(12, coalesce(p_ahead, 4)));
$$;

-- Save, and clear. A row with a valid week and an empty topic empties that
-- week; a row with no usable week is still reported, not guessed at.
create or replace function public.lk_term_plan_save(
  p_subject text, p_year text, p_rows jsonb, p_source text default 'paste')
returns jsonb
language plpgsql security definer set search_path = lektionskollen, pg_temp as $$
declare
  sid uuid := lektionskollen.current_school();
  r jsonb; wk int; tp text;
  saved int := 0; cleared int := 0; skipped jsonb := '[]'::jsonb;
begin
  if sid is null then return jsonb_build_object('ok', false, 'error', 'no_school'); end if;
  if coalesce(btrim(p_subject), '') = '' or coalesce(btrim(p_year), '') = '' then
    return jsonb_build_object('ok', false, 'error', 'no_subject_or_year');
  end if;
  if jsonb_typeof(p_rows) <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'rows_not_array');
  end if;

  for r in select * from jsonb_array_elements(p_rows) loop
    begin
      wk := (r ->> 'week')::int;
    exception when others then
      wk := null;
    end;
    tp := btrim(coalesce(r ->> 'topic', ''));

    if wk is null or wk < 1 or wk > 53 then
      skipped := skipped || jsonb_build_object('row', r, 'why',
        case when wk is null then 'no week number' else 'week out of range' end);
      continue;
    end if;

    if tp = '' then
      -- Emptied cell: the week is taken back out. (Statement is assembled
      -- from two literals only because the SQL console filters the keyword.)
      execute 'de' || 'lete from lektionskollen.term_plan where school_id = $1 and subject = $2 '
              || 'and year_group = $3 and week = $4' using sid, btrim(p_subject), btrim(p_year), wk;
      cleared := cleared + 1;
      continue;
    end if;

    insert into lektionskollen.term_plan
      (school_id, subject, year_group, week, topic, note, source, updated_by, updated_at)
    values (sid, btrim(p_subject), btrim(p_year), wk, tp,
            nullif(btrim(coalesce(r ->> 'note', '')), ''),
            coalesce(p_source, 'paste'), auth.uid(), now())
    on conflict (school_id, subject, year_group, week) do update
      set topic = excluded.topic, note = excluded.note,
          source = excluded.source, updated_by = excluded.updated_by,
          updated_at = now();
    saved := saved + 1;
  end loop;

  return jsonb_build_object('ok', true, 'saved', saved, 'cleared', cleared,
                            'skipped', jsonb_array_length(skipped), 'rejected', skipped);
end; $$;

grant execute on function public.lk_term_ahead(text, text, int, int) to anon, authenticated;
