-- Where the lessons actually live.
--
-- The old generator took ONE question-and-answer pair per topic and used it
-- three times: as the recap question, as task 1, and as the exit ticket. That
-- single shortcut produced every fault the audit found. No amount of template
-- work fixes it, because one Q/A pair cannot make a lesson.
--
-- So the content moves out of the template and into a table, authored per
-- topic, in both languages. The assembler now invents nothing: every question
-- a pupil is asked, and every answer a substitute reads, was written here
-- deliberately.
create table if not exists lektionskollen.sim_content (
  key        text primary key,
  subject    text not null,
  year_group text not null,
  minutes    int  not null,
  sv         jsonb not null,
  en         jsonb not null,
  updated_at timestamptz not null default now()
);

-- The shape of sv/en, for anyone adding a topic:
--   subj          the subject in that language, for the opening script
--   title, goal, boardTitle, where
--   recall  { why, qs: [{q,a}, …] }      what they ALREADY know — never this lesson
--   model   { p, st: [{b,s}, …], a, tq, ta }
--                 p  the problem, st the steps (b = board, s = what to say),
--                 a  its answer, tq/ta the one the class does with you
--   misconceptions [{ t, w, s }]          they say / why / what you say back
--   tasks   [{q,a}, …]                    independent practice
--   exit    { q, a }                      distinct from everything above

-- first90 is the same four moves in every lesson and differs only by the name
-- of the subject, so it is built here rather than authored 52 times.
create or replace function lektionskollen.sim_first90(subj text, lang text)
returns jsonb language sql immutable as $$
  select case when lang = 'sv' then jsonb_build_array(
      'Stå vid dörren. Säg god morgon till varje elev som kommer in.',
      'Skriv ditt namn på tavlan innan lektionen börjar.',
      'Säg: "Jag heter [ditt namn] och jag är här idag. Vi arbetar med ' || lower(subj) || '. Sitt där ni brukar sitta."',
      'Ta närvaron högt från listan. Det tar 60 sekunder och sätter tonen.')
    else jsonb_build_array(
      'Stand at the door. Say good morning to every pupil who comes in.',
      'Write your name on the board before the lesson starts.',
      'Say: "My name is [your name] and I am here today. We are working on ' || lower(subj) || '. Sit where you normally sit."',
      'Take the register out loud from the list. It takes 60 seconds and sets the tone.')
  end;
$$;

-- One topic, one language, assembled into a plan.
create or replace function lektionskollen.sim_plan(p_key text, p_lang text)
returns jsonb language sql stable as $$
  select lektionskollen.sim_assemble(
           (case when p_lang = 'sv' then sv else en end)
             || jsonb_build_object('first90', lektionskollen.sim_first90(
                  (case when p_lang = 'sv' then sv else en end) ->> 'subj', p_lang)),
           jsonb_build_object('su', subject, 'y', year_group, 'm', minutes),
           p_lang)
    from lektionskollen.sim_content where key = p_key;
$$;

-- Rebuild every plan from its authored content. Safe to re-run.
--   update lektionskollen.plans p
--      set body = lektionskollen.sim_plan(c.key,'sv'),
--          body_alt = lektionskollen.sim_plan(c.key,'en')
--     from lektionskollen.sim_content c where c.sv->>'title' = p.title;

grant execute on function lektionskollen.sim_first90(text, text) to service_role;
grant execute on function lektionskollen.sim_plan(text, text)    to service_role;
