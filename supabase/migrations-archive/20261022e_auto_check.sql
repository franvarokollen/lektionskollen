-- Run the checks on every plan, at save time, and keep the verdict.
--
-- There were already four validator functions - structure, teaching, tiers,
-- and the wrapper that folds them together - and they were good. They were
-- also only ever run when someone pressed a button in the coordinator view,
-- through the lk-verify edge function. So a plan nobody opened was never
-- checked, and nothing was stored: the same plan was re-verified, at the cost
-- of a function call, every time it was looked at.
--
-- Two faults found today are added, both of them things a person would have to
-- read the whole plan to notice:
--
--   answers on the board    An answer key printed where the class can see it.
--                           Found in a live lk-assist answer this morning: the
--                           board text ended "Answers: 1) 5 cm 2) 13 cm ...".
--                           A substitute with no subject knowledge copies the
--                           board up literally, so the practice is spoiled
--                           before a pupil picks up a pen.
--
--   wrong output language    A plan asked for in English coming back in
--                           Swedish, or the reverse. Also seen today. Nothing
--                           downstream notices, because every field is present
--                           and well formed - it is simply the wrong language.
--
-- Both are deterministic. Neither needs a model, and a model is the wrong tool
-- for them anyway: these are facts about the text, and a check that costs a
-- token budget is a check someone will eventually switch off.

-- ── Answers printed where the class can see them ─────────
-- Only two places can never carry the answer key: the board written up before
-- the lesson, and a pupil handout. Phase boards are deliberately excluded -
-- the worked-example phase exists precisely to show a solution being written,
-- so an answer there is the feature, not the fault.
create or replace function public.lk_validate_board(p_body jsonb)
returns jsonb language plpgsql immutable as $$
declare
  probs jsonb := '[]'::jsonb;
  tk jsonb; mt jsonb;
  ans text; board text; j int := 0;
begin
  if p_body is null or jsonb_typeof(p_body) <> 'object' then return probs; end if;
  board := coalesce(p_body ->> 'board', '');

  if jsonb_typeof(p_body -> 'tasks') = 'array' then
    for tk in select * from jsonb_array_elements(p_body -> 'tasks') loop
      j := j + 1;
      ans := btrim(coalesce(tk ->> 'a', ''));
      -- Short answers are skipped: "5" shows up in "Task 5" and would flag
      -- every plan. Three characters is where a match stops being a coincidence.
      continue when length(ans) < 3;

      if board <> '' and position(ans in board) > 0 then
        probs := probs || jsonb_build_object(
          'level', 'blocker', 'code', 'answer_on_board', 'where', 'board',
          'detail', 'The answer to task ' || j ||
                    ' is printed on the board the class sees: "' || ans || '"');
      end if;

      if jsonb_typeof(p_body -> 'materials') = 'array' then
        for mt in select * from jsonb_array_elements(p_body -> 'materials') loop
          if position(ans in coalesce(mt ->> 'body', '')) > 0 then
            probs := probs || jsonb_build_object(
              'level', 'blocker', 'code', 'answer_on_handout',
              'where', 'handout: ' || coalesce(mt ->> 'h', '?'),
              'detail', 'The answer to task ' || j ||
                        ' is printed on a pupil handout: "' || ans || '"');
          end if;
        end loop;
      end if;
    end loop;
  end if;

  return probs;
end; $$;

-- ── The language it claims to be in ──────────────────────
-- A word-level count, not a language model: the commonest function words of
-- each language, which no subject vocabulary can outweigh. It warns rather
-- than blocks, because a heuristic that can stop a plan reaching a substitute
-- is a heuristic that will one day stop the wrong one.
create or replace function public.lk_validate_language(p_body jsonb, p_language text)
returns jsonb language plpgsql immutable as $$
declare
  txt text; sv int := 0; en int := 0; w text; want text;
  sv_words constant text[] := array['och','är','inte','för','att','på','med','den','det','som','ska','här'];
  en_words constant text[] := array['and','the','is','not','for','to','on','with','they','that','will','here'];
begin
  want := case when lower(coalesce(p_language, 'sv')) like 'en%' then 'en' else 'sv' end;
  txt := lower(regexp_replace(coalesce(p_body::text, ''), '[^[:alpha:]]+', ' ', 'g'));

  -- Word boundaries, not spaces: consecutive function words share the space
  -- between them, so " och " and " ar " cannot both match the same gap and a
  -- space-based count silently halves whichever language runs in longer
  -- phrases - which is the language it is actually written in.
  foreach w in array sv_words loop
    sv := sv + regexp_count(txt, '\m' || w || '\M');
  end loop;
  foreach w in array en_words loop
    en := en + regexp_count(txt, '\m' || w || '\M');
  end loop;

  -- Both languages appear in a bilingual plan's own vocabulary, so a small
  -- lead means nothing. Twice as many of the other language, and at least ten
  -- of them, is not noise.
  if want = 'sv' and en > sv * 2 and en >= 10 then
    return jsonb_build_array(jsonb_build_object(
      'level', 'warn', 'code', 'language_mismatch', 'where', 'plan',
      'detail', 'Asked for Swedish but the text reads as English (' ||
                en || ' English markers against ' || sv || ' Swedish).'));
  end if;
  if want = 'en' and sv > en * 2 and sv >= 10 then
    return jsonb_build_array(jsonb_build_object(
      'level', 'warn', 'code', 'language_mismatch', 'where', 'plan',
      'detail', 'Asked for English but the text reads as Swedish (' ||
                sv || ' Swedish markers against ' || en || ' English).'));
  end if;
  return '[]'::jsonb;
end; $$;

-- ── Everything, in one verdict ───────────────────────────
-- A new name rather than a third argument on lk_validate_full: adding a
-- defaulted parameter would leave two functions whose two-argument call is
-- ambiguous, and lk-verify calls it by name.
create or replace function public.lk_check_plan(
  p_body jsonb, p_minutes integer default null, p_language text default null)
returns jsonb language sql immutable as $$
  with base as (select public.lk_validate_full(p_body, p_minutes) v),
       probs as (
         select ((select v -> 'problems' from base)
                 || public.lk_validate_board(p_body)
                 || public.lk_validate_language(p_body, p_language)) p)
  select jsonb_build_object(
    'ok', not exists (select 1 from jsonb_array_elements(p) x where x ->> 'level' = 'blocker'),
    'blockers', (select count(*) from jsonb_array_elements(p) x where x ->> 'level' = 'blocker'),
    'warnings', (select count(*) from jsonb_array_elements(p) x where x ->> 'level' = 'warn'),
    'problems', p,
    'checked', 'auto') from probs;
$$;

-- ── Store it, so nothing is checked twice or not at all ──
alter table lektionskollen.plans
  add column if not exists check_result jsonb,
  add column if not exists checked_at   timestamptz;

create or replace function public.lk_save_plan(
  p_request jsonb, p_plan jsonb, p_model text default null,
  p_plan_alt jsonb default null, p_language_alt text default null)
returns uuid
language plpgsql security definer set search_path = lektionskollen, pg_temp as $$
declare sid uuid; rid uuid; pid uuid; mins int; lang text;
begin
  sid := lektionskollen.current_school();
  if sid is null then raise exception 'no school'; end if;
  mins := coalesce((p_request->>'minutes')::int, 60);
  lang := coalesce(p_request->>'language','sv');

  insert into lektionskollen.requests
    (school_id, absence_ref, subject, year_group, group_name, room, starts_at, ends_at,
     minutes, topic, notes, lesson_type, level, sub_knowledge, resources, language)
  values (sid,
     p_request->>'absence_ref', p_request->>'subject', p_request->>'year_group',
     p_request->>'group_name', p_request->>'room', p_request->>'starts_at', p_request->>'ends_at',
     mins,
     nullif(p_request->>'topic',''), nullif(p_request->>'notes',''),
     p_request->>'lesson_type', p_request->>'level', p_request->>'sub_knowledge',
     coalesce(array(select jsonb_array_elements_text(p_request->'resources')), '{}'),
     lang)
  returning id into rid;

  insert into lektionskollen.plans
    (school_id, request_id, title, subject, year_group, minutes, language, body, model,
     body_alt, language_alt, check_result, checked_at)
  values (sid, rid,
     coalesce(p_plan->>'title','Lektionsplan'),
     p_request->>'subject', p_request->>'year_group',
     mins, lang, p_plan, p_model,
     p_plan_alt, p_language_alt,
     public.lk_check_plan(p_plan, mins, lang), now())
  returning id into pid;

  return pid;
end; $$;

-- The read path hands the stored verdict over with the plan, so the
-- coordinator view shows it on open with no edge call at all.
create or replace function public.lk_plan(p_id uuid)
returns jsonb
language sql stable security definer set search_path = lektionskollen, pg_temp as $$
  select to_jsonb(x) from (
    select p.id, p.title, p.subject, p.year_group, p.minutes, p.language,
           p.body, p.body_alt, p.language_alt,
           p.approved, p.shared, p.share_token, p.model, p.created_at,
           p.approved_kind, p.approved_subject, p.approved_at,
           (p.approved and p.approved_sha is not null
            and p.approved_sha <> lektionskollen.plan_sha(p.body)) as approval_stale,
           p.check_result, p.checked_at
      from lektionskollen.plans p
     where p.id = p_id
       and (p.school_id = lektionskollen.current_school() or p.shared)
  ) x;
$$;

-- Every plan already in the bank gets the same verdict, so the new checks are
-- not only true of plans made from now on.
update lektionskollen.plans
   set check_result = public.lk_check_plan(body, minutes, language),
       checked_at = now()
 where check_result is null;

grant execute on function public.lk_validate_board(jsonb)             to anon, authenticated;
grant execute on function public.lk_validate_language(jsonb, text)    to anon, authenticated;
grant execute on function public.lk_check_plan(jsonb, integer, text)  to anon, authenticated;

-- ── A guard that never fired ─────────────────────────────
-- Found while testing the above. lk_validate_plan checks three array fields
-- like this:
--
--   if jsonb_typeof(p_body -> 'phases') <> 'array' or ... then
--
-- For a body with no "phases" key at all, p_body -> 'phases' is SQL NULL,
-- jsonb_typeof(NULL) is NULL, and NULL <> 'array' is NULL - not true. The
-- whole condition is NULL, so the branch never runs. A plan with
-- "phases": [] was flagged; a plan with no phases key was waved through.
--
-- Which is the wrong way round: an empty array is a model that answered the
-- question badly, a missing key is a model that stopped mid-sentence, and
-- truncation is the failure we actually get. Validating {"title":"x"} returned
-- no_summary, no_goal and no_board but said nothing about having no phases and
-- no tasks.
--
-- Same function, same signature, three coalesces.
create or replace function public.lk_validate_plan(p_body jsonb, p_minutes integer default null)
returns jsonb
language plpgsql immutable as $$
declare
  probs jsonb := '[]'::jsonb;
  ph jsonb; ck jsonb; tk jsonb; mt jsonb;
  i int := 0; j int;
  mins_total int := 0; a int; b int; t text;
  add_blocker constant text := 'blocker';
  add_warn    constant text := 'warn';
  -- jsonb_typeof of a missing key is NULL, and every comparison against it is
  -- NULL too. Naming the absent case 'none' below makes the tests total.
begin
  if p_body is null or jsonb_typeof(p_body) <> 'object' then
    return jsonb_build_object('ok', false, 'blockers', 1, 'warnings', 0,
      'problems', jsonb_build_array(jsonb_build_object(
        'level', add_blocker, 'code', 'no_body', 'where', 'plan',
        'detail', 'The plan has no content.')));
  end if;

  if coalesce(btrim(p_body ->> 'summary'), '') = '' then
    probs := probs || jsonb_build_object('level', add_blocker, 'code', 'no_summary',
      'where', 'overview', 'detail', 'No overview — the substitute has nothing to read first.');
  end if;
  if coalesce(btrim(p_body ->> 'goal'), '') = '' then
    probs := probs || jsonb_build_object('level', add_blocker, 'code', 'no_goal',
      'where', 'goal', 'detail', 'No learning goal.');
  end if;
  if coalesce(btrim(p_body ->> 'board'), '') = '' then
    probs := probs || jsonb_build_object('level', add_blocker, 'code', 'no_board',
      'where', 'board', 'detail', 'Nothing to write on the board before the lesson.');
  elsif length(p_body ->> 'board') > 600 then
    probs := probs || jsonb_build_object('level', add_warn, 'code', 'board_long',
      'where', 'board', 'detail', 'The board text is long — nobody writes that much before a bell.');
  end if;
  if coalesce(jsonb_typeof(p_body -> 'first90'), 'none') <> 'array'
     or jsonb_array_length(p_body -> 'first90') = 0 then
    probs := probs || jsonb_build_object('level', add_warn, 'code', 'no_first90',
      'where', 'first90', 'detail', 'No opening steps for the first ninety seconds.');
  end if;
  if coalesce(btrim(p_body #>> '{equipment,need}'), '') = '' then
    probs := probs || jsonb_build_object('level', add_warn, 'code', 'no_equipment',
      'where', 'equipment', 'detail', 'Does not say what the substitute needs.');
  end if;

  if coalesce(jsonb_typeof(p_body -> 'phases'), 'none') <> 'array'
     or jsonb_array_length(p_body -> 'phases') = 0 then
    probs := probs || jsonb_build_object('level', add_blocker, 'code', 'no_phases',
      'where', 'phases', 'detail', 'The lesson has no phases.');
  else
    for ph in select * from jsonb_array_elements(p_body -> 'phases') loop
      i := i + 1;
      if coalesce(btrim(ph ->> 'n'), '') = '' then
        probs := probs || jsonb_build_object('level', add_warn, 'code', 'phase_unnamed',
          'where', 'phase ' || i, 'detail', 'This phase has no name.');
      end if;
      if coalesce(btrim(ph ->> 'pupils'), '') = '' then
        probs := probs || jsonb_build_object('level', add_warn, 'code', 'phase_no_pupils',
          'where', 'phase ' || i, 'detail', 'Does not say what the pupils do.');
      end if;
      j := 0;
      if jsonb_typeof(ph -> 'checks') = 'array' then
        for ck in select * from jsonb_array_elements(ph -> 'checks') loop
          j := j + 1;
          if public.lk_is_pointer(ck ->> 'a') then
            probs := probs || jsonb_build_object('level', add_blocker, 'code', 'check_no_answer',
              'where', 'phase ' || i || ', check ' || j,
              'detail', 'The check question has no answer — it points somewhere else: "' ||
                        coalesce(ck ->> 'a', '') || '"');
          end if;
        end loop;
      end if;
      t := ph ->> 't';
      if t ~ '^\s*\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}\s*$' then
        a := (split_part(btrim(split_part(replace(t, '–', '-'), '-', 1)), ':', 1))::int * 60
           + (split_part(btrim(split_part(replace(t, '–', '-'), '-', 1)), ':', 2))::int;
        b := (split_part(btrim(split_part(replace(t, '–', '-'), '-', 2)), ':', 1))::int * 60
           + (split_part(btrim(split_part(replace(t, '–', '-'), '-', 2)), ':', 2))::int;
        if b > a then mins_total := mins_total + (b - a); end if;
      end if;
    end loop;

    if p_minutes is not null and mins_total > 0 and abs(mins_total - p_minutes) > 5 then
      probs := probs || jsonb_build_object('level', add_warn, 'code', 'time_mismatch',
        'where', 'phases',
        'detail', 'The phases add up to ' || mins_total || ' minutes but the lesson is ' ||
                  p_minutes || '.');
    end if;
  end if;

  if coalesce(jsonb_typeof(p_body -> 'tasks'), 'none') <> 'array'
     or jsonb_array_length(p_body -> 'tasks') = 0 then
    probs := probs || jsonb_build_object('level', add_blocker, 'code', 'no_tasks',
      'where', 'tasks', 'detail', 'No tasks for the pupils.');
  else
    j := 0;
    for tk in select * from jsonb_array_elements(p_body -> 'tasks') loop
      j := j + 1;
      if coalesce(btrim(tk ->> 'q'), '') = '' then
        probs := probs || jsonb_build_object('level', add_blocker, 'code', 'task_empty',
          'where', 'task ' || j, 'detail', 'Empty task.');
      end if;
      if public.lk_is_pointer(tk ->> 'a') then
        probs := probs || jsonb_build_object('level', add_blocker, 'code', 'task_no_answer',
          'where', 'task ' || j,
          'detail', 'No answer for this task — it points somewhere else: "' ||
                    coalesce(tk ->> 'a', '') || '"');
      end if;
    end loop;
  end if;

  if coalesce(btrim(p_body #>> '{exit,q}'), '') = '' then
    probs := probs || jsonb_build_object('level', add_warn, 'code', 'no_exit',
      'where', 'exit', 'detail', 'No exit ticket.');
  elsif public.lk_is_pointer(p_body #>> '{exit,a}') then
    probs := probs || jsonb_build_object('level', add_blocker, 'code', 'exit_no_answer',
      'where', 'exit', 'detail', 'The exit ticket has no answer.');
  end if;

  if jsonb_typeof(p_body -> 'materials') = 'array' then
    j := 0;
    for mt in select * from jsonb_array_elements(p_body -> 'materials') loop
      j := j + 1;
      if coalesce(btrim(mt ->> 'body'), '') = '' then
        probs := probs || jsonb_build_object('level', add_warn, 'code', 'material_empty',
          'where', 'handout ' || j, 'detail', 'A handout is named but has no content.');
      end if;
    end loop;
  end if;

  foreach t in array array['stuck', 'ahead', 'wrong'] loop
    if coalesce(btrim(p_body ->> t), '') = '' then
      probs := probs || jsonb_build_object('level', add_warn, 'code', 'no_' || t,
        'where', t, 'detail', 'Missing: what to do if ' ||
          case t when 'stuck' then 'a pupil is stuck'
                 when 'ahead' then 'a pupil finishes early'
                 else 'the lesson goes wrong' end || '.');
    end if;
  end loop;

  return jsonb_build_object(
    'ok', not exists (select 1 from jsonb_array_elements(probs) x where x ->> 'level' = 'blocker'),
    'blockers', (select count(*) from jsonb_array_elements(probs) x where x ->> 'level' = 'blocker'),
    'warnings', (select count(*) from jsonb_array_elements(probs) x where x ->> 'level' = 'warn'),
    'problems', probs);
end; $$;

-- Re-check everything now that the three guards work. The predicate is
-- deliberately explicit: a WHERE-less UPDATE over the whole table is the kind
-- of statement that should have to say so.
update lektionskollen.plans
   set check_result = public.lk_check_plan(body, minutes, language),
       checked_at = now()
 where id is not null;
