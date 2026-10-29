-- The plan learns to teach, not just to list.
--
-- An audit of all 32 plans found three faults in the 26 built from the template,
-- and they are all the same fault wearing different clothes: the template had
-- exactly one question-and-answer pair per topic and used it three times.
--
--   * the exit ticket was identical to task 1
--   * the opening "what do you remember" question was identical to the exit
--     ticket, so the lesson opened by asking pupils to do the thing it had not
--     taught yet
--   * the script said "I'll show you an example, then we'll do one together"
--     and no example existed anywhere in the plan
--
-- The third is the same class of fault as the one that started this work: the
-- plan instructs the substitute to produce something that is not there.
--
-- What the research says a lesson needs, and what we were missing:
--
--   Rosenshine 1  daily review          -> recall, with its own questions
--   Rosenshine 4  provide models        -> model, a worked example, step by step
--   Rosenshine 5  guide practice        -> model.together, the "we do"
--   Rosenshine 9  independent practice  -> tasks, graded, no longer a repeat
--   EEF           non-examples          -> misconceptions
--   Sweller       split attention       -> every answer travels with its question
--   Lemov         double planning       -> each step carries both board and script
--
-- So the five phases are no longer decoration. They are the sequence itself.

-- ── Phase boundaries ─────────────────────────────────────
-- Proportional, and they sum to exactly the lesson length so the validator's
-- time check stays meaningful. 60 min -> 8 / 12 / 10 / 22 / 8.
create or replace function lektionskollen.sim_marks(m int)
returns int[] language sql immutable as $$
  select array[0,
               round(m * 0.13)::int,
               round(m * 0.33)::int,
               round(m * 0.50)::int,
               round(m * 0.87)::int,
               m];
$$;

create or replace function lektionskollen.sim_span(marks int[], i int)
returns text language sql immutable as $$
  select '00:' || lpad(marks[i]::text, 2, '0') || '–00:' || lpad(marks[i + 1]::text, 2, '0');
$$;

-- ── The assembler ────────────────────────────────────────
-- c is the authored content for one topic in one language. Everything that
-- varies by subject comes from c; only the classroom boilerplate is built here,
-- and none of it invents a question or an answer.
create or replace function lektionskollen.sim_assemble(c jsonb, meta jsonb, lang text)
returns jsonb language sql immutable as $$
  with m as (select (meta ->> 'm')::int as mins),
       k as (select lektionskollen.sim_marks(mins) as marks, mins from m),
       w as (select case when lang = 'sv' then
               jsonb_build_object(
                 'recall',  'Repetition', 'model', 'Genomgång på tavlan',
                 'together','Vi gör ett tillsammans', 'indep', 'Eget arbete', 'exit', 'Exit-fråga',
                 'summary', 'Eleverna repeterar det de behöver, ser ett räknat exempel på tavlan, gör ett tillsammans med dig och arbetar sedan själva. Du behöver inga förkunskaper — varje steg står utskrivet och alla svar finns med.',
                 'sayRecall','"Innan vi börjar — två frågor om sådant ni redan kan. Inga händer upp, jag frågar."',
                 'sayModel', '"Titta på tavlan. Jag räknar ett exempel och säger varje steg högt. Skriv av."',
                 'sayTog',   '"Nu gör vi ett tillsammans. Jag skriver, ni säger vad jag ska göra."',
                 'sayIndep', '"Nu arbetar ni själva. Jag går runt. Räck upp handen om ni fastnar."',
                 'sayExit',  '"Sista fem minuterna. Skriv svaret på en lapp med ert namn och lämna den till mig på vägen ut."',
                 'pupRecall','Svarar när du pekar på dem. Skriv svaren på tavlan.',
                 'pupModel', 'Tittar och skriver av exemplet steg för steg.',
                 'pupTog',   'Säger nästa steg högt. En elev får komma fram och skriva.',
                 'pupIndep', 'Arbetar med uppgifterna i boken eller på arbetsbladet.',
                 'pupExit',  'Skriver svaret på en lapp och lämnar in den.',
                 'expRecall','Alla kommer inte ihåg. Det är meningen — därför repeterar vi.',
                 'expModel', 'Tyst i klassrummet här. Om det blir prat, stanna och vänta.',
                 'expTog',   'Två eller tre räcker upp handen. Fråga någon som inte gjorde det.',
                 'expIndep', 'De snabbaste är klara efter halva tiden — se "klara tidigt".',
                 'expExit',  'Räkna lapparna mot närvaron. Saknas någon, fråga vem.',
                 'need',     'Whiteboard och penna. Inget annat krävs.',
                 'fallback', 'Om projektorn är trasig spelar det ingen roll — hela lektionen går på tavlan.',
                 'stuck',    'Gå tillbaka till exemplet på tavlan och gör uppgift 1 med dem, steg för steg.',
                 'ahead',    'Be dem skriva en egen uppgift av samma typ, med facit, till en kompis.',
                 'wrong',    'Blir det stökigt: tyst skrivande i fem minuter, samla in, avsluta med exit-frågan.',
                 'sheet',    'Arbetsblad', 'copier', '(Skriv uppgifterna på tavlan om kopiatorn inte fungerar.)',
                 'worked',   'Räknat exempel', 'handover', 'Vi hann ')
             else
               jsonb_build_object(
                 'recall',  'Recap', 'model', 'Worked example on the board',
                 'together','One together', 'indep', 'Independent work', 'exit', 'Exit question',
                 'summary', 'Pupils recap what they need, watch a worked example on the board, do one with you, then work on their own. You need no prior knowledge — every step is written out and every answer is included.',
                 'sayRecall','"Before we start — two questions about things you already know. No hands up, I''ll pick."',
                 'sayModel', '"Look at the board. I''ll work through one example and say every step out loud. Copy it down."',
                 'sayTog',   '"Now we do one together. I write, you tell me what to do."',
                 'sayIndep', '"Now work on your own. I''ll come round. Hand up if you get stuck."',
                 'sayExit',  '"Last five minutes. Write the answer on a slip with your name and hand it to me on the way out."',
                 'pupRecall','Answer when you point at them. Write the answers on the board.',
                 'pupModel', 'Watch and copy the example down step by step.',
                 'pupTog',   'Call out the next step. One pupil comes up and writes.',
                 'pupIndep', 'Work through the tasks in the book or on the worksheet.',
                 'pupExit',  'Write the answer on a slip and hand it in.',
                 'expRecall','Not everyone will remember. That is the point — that is why we recap.',
                 'expModel', 'The room should be quiet here. If it is not, stop and wait.',
                 'expTog',   'Two or three hands will go up. Ask someone whose did not.',
                 'expIndep', 'The quickest finish halfway through — see "finished early".',
                 'expExit',  'Count the slips against the register. If one is missing, ask who.',
                 'need',     'Whiteboard and pen. Nothing else is required.',
                 'fallback', 'If the projector is broken it makes no difference — the whole lesson runs on the board.',
                 'stuck',    'Go back to the example on the board and do task 1 with them, step by step.',
                 'ahead',    'Ask them to write their own task of the same kind, with the answer, for a partner.',
                 'wrong',    'If it gets noisy: five minutes of silent writing, collect it in, finish with the exit question.',
                 'sheet',    'Worksheet', 'copier', '(Write the tasks on the board if the copier is broken.)',
                 'worked',   'Worked example', 'handover', 'We got through ')
             end as w)
  select jsonb_build_object(
    'title', c ->> 'title',
    'summary', w ->> 'summary',
    'goal', c ->> 'goal',
    'curriculum', (meta ->> 'su') || ' ' || (meta ->> 'y') || ' — ' ||
                  case when lang = 'sv' then 'centralt innehåll.' else 'core content.' end,
    'readTime', '3 min',
    'board', (c ->> 'boardTitle') || chr(10) || (c ->> 'goal') || chr(10) || chr(10) || (c #>> '{model,p}'),
    'equipment', jsonb_build_object(
      'need', w ->> 'need', 'fallback', w ->> 'fallback', 'where', c ->> 'where'),
    'first90', c -> 'first90',

    -- Rosenshine 1. Its own questions, about what came before — never the
    -- lesson's own content, which is the fault this replaces.
    'recall', c -> 'recall',

    -- Rosenshine 4. Each step carries what goes on the board and what to say
    -- while writing it, so the substitute never has to invent either.
    'model', c -> 'model',

    -- EEF: the wrong answer pupils actually give, why it is wrong, and the
    -- sentence that corrects it.
    'misconceptions', c -> 'misconceptions',

    'phases', jsonb_build_array(
      jsonb_build_object('t', lektionskollen.sim_span((select marks from k), 1),
        'n', w ->> 'recall', 'say', w ->> 'sayRecall', 'pupils', w ->> 'pupRecall',
        'expect', w ->> 'expRecall', 'board', c #>> '{recall,why}',
        'checks', c #> '{recall,qs}'),
      jsonb_build_object('t', lektionskollen.sim_span((select marks from k), 2),
        'n', w ->> 'model', 'say', w ->> 'sayModel', 'pupils', w ->> 'pupModel',
        'expect', w ->> 'expModel',
        'board', (select string_agg(s ->> 'b', chr(10) order by o)
                    from jsonb_array_elements(c #> '{model,st}') with ordinality as t(s, o)),
        'checks', jsonb_build_array(jsonb_build_object(
          'q', c #>> '{model,p}', 'a', c #>> '{model,a}'))),
      jsonb_build_object('t', lektionskollen.sim_span((select marks from k), 3),
        'n', w ->> 'together', 'say', w ->> 'sayTog', 'pupils', w ->> 'pupTog',
        'expect', w ->> 'expTog', 'board', c #>> '{model,tq}',
        'checks', jsonb_build_array(jsonb_build_object(
          'q', c #>> '{model,tq}', 'a', c #>> '{model,ta}'))),
      jsonb_build_object('t', lektionskollen.sim_span((select marks from k), 4),
        'n', w ->> 'indep', 'say', w ->> 'sayIndep', 'pupils', w ->> 'pupIndep',
        'expect', w ->> 'expIndep',
        'board', (select string_agg(o || '. ' || (x ->> 'q'), chr(10) order by o)
                    from jsonb_array_elements(c -> 'tasks') with ordinality as t(x, o)),
        'checks', jsonb_build_array()),
      jsonb_build_object('t', lektionskollen.sim_span((select marks from k), 5),
        'n', w ->> 'exit', 'say', w ->> 'sayExit', 'pupils', w ->> 'pupExit',
        'expect', w ->> 'expExit', 'board', c #>> '{exit,q}',
        'checks', jsonb_build_array(jsonb_build_object(
          'q', c #>> '{exit,q}', 'a', c #>> '{exit,a}')))),

    'materials', jsonb_build_array(
      jsonb_build_object('h', w ->> 'worked',
        'body', (c #>> '{model,p}') || chr(10) || chr(10) ||
                (select string_agg(s ->> 'b', chr(10) order by o)
                   from jsonb_array_elements(c #> '{model,st}') with ordinality as t(s, o))),
      jsonb_build_object('h', w ->> 'sheet',
        'body', (select string_agg(o || '. ' || (x ->> 'q'), chr(10) order by o)
                   from jsonb_array_elements(c -> 'tasks') with ordinality as t(x, o))
                || chr(10) || chr(10) || (w ->> 'copier'))),

    'tasks', c -> 'tasks',
    'stuck', w ->> 'stuck',
    'ahead', w ->> 'ahead',
    'wrong', w ->> 'wrong',
    'exit', c -> 'exit',
    'handover', (w ->> 'handover') || lower(c ->> 'title') || '.')
  from k, w;
$$;

grant execute on function lektionskollen.sim_marks(int)                  to service_role;
grant execute on function lektionskollen.sim_span(int[], int)            to service_role;
grant execute on function lektionskollen.sim_assemble(jsonb, jsonb, text) to service_role;
