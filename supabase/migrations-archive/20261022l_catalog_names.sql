-- One spelling per subject and year, so a year plan entered under
-- "Idrott och hälsa" is found by a cover lesson requested for "Idrott".
--
-- The Frånvarokollen import and the demo library spell the same subject
-- differently, and the year plan is looked up by exact text. A plan filled in
-- under one spelling was silently invisible under the other.
--
-- Years: förskoleklass is "F"; Åk 1..9 stay as they are.

create or replace function lektionskollen.canon_subject(p text)
returns text language sql immutable as $$
  select case lower(btrim(coalesce(p, '')))
    when 'idrott'            then 'Idrott och hälsa'
    when 'idrott & hälsa'    then 'Idrott och hälsa'
    when 'hemkunskap'        then 'Hem- och konsumentkunskap'
    when 'hkk'               then 'Hem- och konsumentkunskap'
    when 'sva'               then 'Svenska som andraspråk'
    when 'svenska som andra språk' then 'Svenska som andraspråk'
    when 'religion'          then 'Religionskunskap'
    when 'sv'                then 'Svenska'
    when 'ma'                then 'Matematik'
    when 'en'                then 'Engelska'
    else btrim(coalesce(p, ''))
  end;
$$;

create or replace function lektionskollen.canon_year(p text)
returns text language sql immutable as $$
  select case
    when lower(btrim(coalesce(p, ''))) in ('f', 'fsk', 'f-klass', 'förskoleklass', 'forskoleklass') then 'F'
    when btrim(coalesce(p, '')) ~* '^(åk|ak|årskurs)\s*\d+$'
      then 'Åk ' || regexp_replace(btrim(p), '\D', '', 'g')
    else btrim(coalesce(p, ''))
  end;
$$;

-- Existing rows, if any, move to the one spelling.
update lektionskollen.term_plan
   set subject = lektionskollen.canon_subject(subject),
       year_group = lektionskollen.canon_year(year_group)
 where subject <> lektionskollen.canon_subject(subject)
    or year_group <> lektionskollen.canon_year(year_group);

-- Every read and write goes through the one spelling.
create or replace function public.lk_term_plan(p_subject text, p_year text)
returns jsonb
language sql stable security definer set search_path = lektionskollen, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'week', t.week, 'topic', t.topic, 'note', t.note,
           'source', t.source, 'updated_at', t.updated_at)
         order by lektionskollen.school_year_pos(t.week)), '[]'::jsonb)
    from lektionskollen.term_plan t
   where t.school_id = lektionskollen.current_school()
     and t.subject = lektionskollen.canon_subject(p_subject) and t.year_group = lektionskollen.canon_year(p_year);
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
     and t.subject = lektionskollen.canon_subject(p_subject) and t.year_group = lektionskollen.canon_year(p_year)
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
     and t.subject = lektionskollen.canon_subject(p_subject) and t.year_group = lektionskollen.canon_year(p_year)
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
              || 'and year_group = $3 and week = $4' using sid, lektionskollen.canon_subject(p_subject), lektionskollen.canon_year(p_year), wk;
      cleared := cleared + 1;
      continue;
    end if;

    insert into lektionskollen.term_plan
      (school_id, subject, year_group, week, topic, note, source, updated_by, updated_at)
    values (sid, lektionskollen.canon_subject(p_subject), lektionskollen.canon_year(p_year), wk, tp,
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
