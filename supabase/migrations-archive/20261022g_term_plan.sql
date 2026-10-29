-- What a department is actually teaching this year.
--
-- Without this, every plan is a guess. A substitute plan on "fractions" for
-- year 7 is only the right lesson if year 7 were doing fractions last week;
-- otherwise it is a competent lesson on the wrong thing, and no amount of
-- model quality fixes that. The single biggest quality lever available is
-- knowing what was taught recently, and the only people who know are the heads
-- of department.
--
-- The hard part is not storage, it is that no two schools hold this the same
-- way: a spreadsheet, a Google Doc, a wall planner, SchoolSoft, a Word file
-- per teacher. Writing an importer per format is a losing game. So there is
-- ONE target shape here - week, topic, optional note - and the messy work of
-- getting anything into that shape happens at the edge, with a person
-- confirming the result before it is saved.
--
-- One topic per week per subject and year. Real plans are messier than that,
-- but a shape a head of department can fill in ten minutes beats a faithful
-- model of their spreadsheet that nobody ever populates. It can grow later;
-- it cannot grow at all if the first version is too much work to enter.

create table if not exists lektionskollen.term_plan (
  school_id  uuid not null references lektionskollen.schools(id) on delete cascade,
  subject    text not null,
  year_group text not null,
  week       int  not null check (week between 1 and 53),
  topic      text not null,
  note       text,
  -- How it got here, so we can tell a careful import from a quick paste when
  -- the data turns out to be wrong.
  source     text,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  primary key (school_id, subject, year_group, week)
);

alter table lektionskollen.term_plan enable row level security;

-- ── Reading ──────────────────────────────────────────────
create or replace function public.lk_term_plan(p_subject text, p_year text)
returns jsonb
language sql stable security definer set search_path = lektionskollen, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'week', t.week, 'topic', t.topic, 'note', t.note,
           'source', t.source, 'updated_at', t.updated_at)
         order by t.week), '[]'::jsonb)
    from lektionskollen.term_plan t
   where t.school_id = lektionskollen.current_school()
     and t.subject = p_subject and t.year_group = p_year;
$$;

-- Which subject and year combinations a school has filled in, so the gap is
-- visible rather than something a coordinator discovers one plan at a time.
create or replace function public.lk_term_coverage()
returns jsonb
language sql stable security definer set search_path = lektionskollen, pg_temp as $$
  select coalesce(jsonb_agg(x order by x->>'subject', x->>'year_group'), '[]'::jsonb)
    from (
      select jsonb_build_object(
               'subject', t.subject, 'year_group', t.year_group,
               'weeks', count(*), 'first_week', min(t.week), 'last_week', max(t.week),
               'updated_at', max(t.updated_at)) as x
        from lektionskollen.term_plan t
       where t.school_id = lektionskollen.current_school()
       group by t.subject, t.year_group
    ) s;
$$;

-- ── What was taught recently ─────────────────────────────
-- The whole point of the table. Defaults to the ISO week now, and looks back
-- three weeks, which is the window in which "we have just done this" is still
-- true for a class.
create or replace function public.lk_term_recent(
  p_subject text, p_year text, p_week int default null, p_back int default 3)
returns jsonb
language sql stable security definer set search_path = lektionskollen, pg_temp as $$
  with w as (select coalesce(p_week, extract(week from current_date)::int) as now_week)
  select coalesce(jsonb_agg(jsonb_build_object('week', t.week, 'topic', t.topic, 'note', t.note)
                            order by t.week), '[]'::jsonb)
    from lektionskollen.term_plan t, w
   where t.school_id = lektionskollen.current_school()
     and t.subject = p_subject and t.year_group = p_year
     and t.week <  w.now_week
     and t.week >= w.now_week - greatest(1, least(10, coalesce(p_back, 3)));
$$;

-- ── Writing ──────────────────────────────────────────────
-- Upsert per week rather than replace-the-year: a head of department pasting
-- the autumn term should not silently wipe the spring they entered in August.
-- Rows are taken one at a time and anything unusable is reported back rather
-- than failing the whole import, because a single bad line in a forty-week
-- paste should not cost someone the other thirty-nine.
create or replace function public.lk_term_plan_save(
  p_subject text, p_year text, p_rows jsonb, p_source text default 'paste')
returns jsonb
language plpgsql security definer set search_path = lektionskollen, pg_temp as $$
declare
  sid uuid := lektionskollen.current_school();
  r jsonb; wk int; tp text;
  saved int := 0; skipped jsonb := '[]'::jsonb;
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

    if wk is null or wk < 1 or wk > 53 or tp = '' then
      skipped := skipped || jsonb_build_object('row', r, 'why',
        case when wk is null then 'no week number'
             when wk < 1 or wk > 53 then 'week out of range'
             else 'no topic' end);
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

  return jsonb_build_object('ok', true, 'saved', saved,
                            'skipped', jsonb_array_length(skipped), 'rejected', skipped);
end; $$;

-- Deliberately no per-week delete in this pass. A head of department who
-- gets a week wrong corrects it by entering that week again, which the
-- upsert above handles. A delete needs a view on who may remove someone
-- else's planning, and that question is worth more than a stub.

grant execute on function public.lk_term_plan(text, text)                    to anon, authenticated;
grant execute on function public.lk_term_coverage()                          to anon, authenticated;
grant execute on function public.lk_term_recent(text, text, int, int)        to anon, authenticated;
grant execute on function public.lk_term_plan_save(text, text, jsonb, text)  to anon, authenticated;
