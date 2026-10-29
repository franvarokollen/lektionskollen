-- Example-lesson assembler support (demo content only, no effect on real plans).
-- sim_plan(key, lang) builds a plan from lektionskollen.sim_content and now
-- honours a per-lesson "over" object; sim_over(...) writes the age- and
-- safety-fit wording that goes into it. The seed rows themselves live only in
-- the database (see tools/dump-content.mjs).

create or replace function lektionskollen.sim_over(p_lang text, p_subj text, p_stage integer, p_safety text, p_need text, p_where text, p_handover text)
 returns jsonb
 language plpgsql
 immutable
as $function$
declare
  sv boolean := (p_lang = 'sv');
  young boolean := (p_stage between 0 and 3);
  babies boolean := (p_stage between 0 and 1);
  f90 jsonb; wrong text; top jsonb := '{}'::jsonb; ph jsonb := null; firstaid text;
begin
  firstaid := case when sv
    then 'Om någon skadar sig: stoppa aktiviteten, ta eleven åt sidan och kontakta skolans första hjälpen-ansvarige eller expeditionen. Hitta inte på något telefonnummer.'
    else 'If someone is hurt: stop the activity, take the pupil aside and contact the school''s first-aid person or the office. Do not make up a phone number.' end;

  if young then
    f90 := case when sv then jsonb_build_array(
        'Möt barnen vid dörren. Säg god morgon och ditt namn.',
        'Låt dem sätta sig på sina vanliga platser eller i ringen. Fråga om du är osäker var de brukar sitta.',
        'Samla gruppen: håll upp en hand och vänta tills alla är tysta och håller upp sin. Höj inte rösten.',
        'Säg: “Jag heter [ditt namn]. Idag ska vi arbeta med ' || lower(p_subj) || '.” Ta närvaron högt genom att säga varje namn.')
      else jsonb_build_array(
        'Meet the children at the door. Say good morning and your name.',
        'Let them sit in their usual places or in the circle. Ask if you are unsure where they normally sit.',
        'Gather the group: hold up one hand and wait until everyone is quiet and holding up theirs. Do not raise your voice.',
        'Say: “My name is [your name]. Today we are working on ' || lower(p_subj) || '.” Take the register out loud by saying each name.') end;
    wrong := case when sv
      then 'Blir det rörigt: samla alla i ringen eller vid tavlan, räkna eller ramsa något kort tillsammans och börja om med första uppgiften.'
      else 'If it gets messy: gather everyone in the circle or at the board, count or chant something short together and start again with the first task.' end;
    top := top || jsonb_build_object(
      'first90', f90, 'wrong', wrong,
      'summary', case when sv
        then 'Eleverna gör saker i små steg: de ser ett exempel, gör ett tillsammans med dig och prövar sedan själva. Du läser alla uppgifter högt. Varje steg står utskrivet och alla svar finns med.'
        else 'Pupils work in small steps: they see an example, do one with you and then try on their own. You read every task aloud. Every step is written out and every answer is included.' end,
      'stuck', case when sv
        then 'Gå tillbaka till exemplet på tavlan och gör första uppgiften tillsammans, steg för steg, med föremål eller händer.'
        else 'Go back to the example on the board and do the first task together, step by step, with objects or hands.' end,
      'ahead', case when sv
        then 'Be dem hitta på en egen uppgift av samma sort och ställa den till en kompis.'
        else 'Ask them to make up a task of the same kind and ask it to a friend.' end);
    ph := case when sv then jsonb_build_array(
      jsonb_build_object('say','“Innan vi börjar frågar jag två saker om sådant ni redan kan. Svara högt tillsammans.”',
        'pupils','Svarar högt tillsammans eller visar med händerna.',
        'expect','Alla svarar inte. Upprepa frågan lugnt och långsamt.'),
      jsonb_build_object('say','“Titta på tavlan. Jag visar ett exempel och säger varje steg högt. Titta och lyssna.”',
        'pupils','Tittar, lyssnar och gör efter med fingrar eller händer.',
        'expect','Det ska vara lugnt. Blir det stimmigt: håll upp en hand och vänta tills alla gör likadant.'),
      jsonb_build_object('say','“Nu gör vi ett tillsammans. Jag visar och ni säger vad jag ska göra.”',
        'pupils','Säger nästa steg högt i kör. En elev i taget får komma fram.',
        'expect','Flera barn svarar för fort eller samtidigt. Sakta ner och låt en i taget svara.'),
      jsonb_build_object('say','“Nu gör ni själva. Jag läser en uppgift i taget högt. Mitt i får ni stå upp, hoppa tre hopp och sätta er igen. Jag kommer till er.”',
        'pupils','Arbetar med föremål, händer, teckning eller samtal. Ingen behöver läsa själv.',
        'expect','De första är klara efter halva tiden. Låt dem hjälpa en kompis, se “klara tidigt”.'),
      case when babies then jsonb_build_object(
        'say','“Sista frågan. Jag frågar er en och en. Svara högt eller visa med händerna.”',
        'pupils','Svarar högt eller visar svaret med händerna.',
        'expect','Skriv upp vilka som klarade det och lämna listan till ordinarie lärare.')
      else jsonb_build_object(
        'say','“Sista frågan. Skriv svaret på en lapp med ditt namn och lämna den till mig.”',
        'pupils','Skriver ett ord eller en kort mening på en lapp.',
        'expect','Räkna lapparna mot närvaron. Saknas någon, fråga vem.') end)
    else jsonb_build_array(
      jsonb_build_object('say','“Before we start I will ask two questions about things you already know. Answer out loud together.”',
        'pupils','Answer out loud together or show with their hands.',
        'expect','Not everyone answers. Repeat the question calmly and slowly.'),
      jsonb_build_object('say','“Look at the board. I will show one example and say every step out loud. Watch and listen.”',
        'pupils','Watch, listen and copy with fingers or hands.',
        'expect','It should be calm. If it gets noisy: hold up a hand and wait until everyone does the same.'),
      jsonb_build_object('say','“Now we do one together. I show it and you tell me what to do.”',
        'pupils','Call out the next step together. One pupil at a time comes up.',
        'expect','Several children answer too fast or at once. Slow down and let one answer at a time.'),
      jsonb_build_object('say','“Now you do it yourselves. I read one task at a time out loud. Halfway through you may stand up, jump three jumps and sit down again. I will come round.”',
        'pupils','Work with objects, hands, drawing or talking. Nobody has to read on their own.',
        'expect','The first are done after half the time. Let them help a friend, see “finished early”.'),
      case when babies then jsonb_build_object(
        'say','“Last question. I ask you one by one. Answer out loud or show with your hands.”',
        'pupils','Answer out loud or show the answer with their hands.',
        'expect','Note who got it and leave the list for the class teacher.')
      else jsonb_build_object(
        'say','“Last question. Write the answer on a slip with your name and hand it to me.”',
        'pupils','Write a word or a short sentence on a slip.',
        'expect','Count the slips against the register. If one is missing, ask who.') end) end;
  end if;

  if p_safety is not null then
    f90 := coalesce(top -> 'first90', lektionskollen.sim_first90(p_subj, p_lang)) || jsonb_build_array(p_safety);
    wrong := coalesce(top ->> 'wrong', case when sv
      then 'Blir det stökigt: tyst skrivande i fem minuter, samla in, avsluta med exit-frågan.'
      else 'If it gets noisy: five minutes of silent writing, collect it in, finish with the exit question.' end)
      || ' ' || firstaid;
    top := top || jsonb_build_object('first90', f90, 'wrong', wrong);
  end if;

  if p_need is not null or p_where is not null then
    top := top || jsonb_build_object('equipment', jsonb_build_object(
      'need', coalesce(p_need, case when sv then 'Whiteboard och penna. Inget annat krävs.' else 'Whiteboard and pen. Nothing else is required.' end),
      'fallback', case when sv then 'Om något material saknas går lektionen att göra med tavlan och papper.'
                       else 'If some material is missing the lesson can run on the board and paper.' end,
      'where', coalesce(p_where, '')));
  end if;
  if p_handover is not null then top := top || jsonb_build_object('handover', p_handover); end if;

  return jsonb_strip_nulls(jsonb_build_object('top', top, 'phases', ph));
end $function$;

create or replace function lektionskollen.sim_plan(p_key text, p_lang text)
 returns jsonb
 language sql
 stable
as $function$
  with src as (
    select case when p_lang = 'sv' then sv else en end as c0, subject, year_group, minutes
      from lektionskollen.sim_content where key = p_key),
  built as (
    select lektionskollen.sim_assemble(
             c0 || jsonb_build_object('first90',
                     coalesce(c0 -> 'first90', lektionskollen.sim_first90(c0 ->> 'subj', p_lang))),
             jsonb_build_object('su', subject, 'y', year_group, 'm', minutes),
             p_lang) as b0,
           c0 -> 'over' as ov
      from src),
  -- A lesson may carry its own wording where the generic script does not fit
  -- the pupils or the subject: over.top replaces whole top-level fields
  -- (equipment, first90, wrong...), over.phases[i] merges into phase i.
  over as (
    select (b0 || coalesce(ov -> 'top', '{}'::jsonb))
           || jsonb_build_object('phases', (
                select jsonb_agg(ph || coalesce(ov -> 'phases' -> ((i - 1)::int), '{}'::jsonb) order by i)
                  from jsonb_array_elements(b0 -> 'phases') with ordinality as t(ph, i))) as b
      from built),
  core as (select b, lektionskollen.tasks_of(b, 'core') as c from over)
  select jsonb_set(
           jsonb_set(b, '{phases,3,board}', to_jsonb((
             select string_agg(o || '. ' || (x ->> 'q'), chr(10) order by o)
               from jsonb_array_elements(c) with ordinality as t(x, o)))),
           '{materials,1,body}', to_jsonb((
             select string_agg(o || '. ' || (x ->> 'q'), chr(10) order by o)
               from jsonb_array_elements(c) with ordinality as t(x, o))
             || chr(10) || chr(10) ||
             case when p_lang = 'sv' then '(Skriv uppgifterna på tavlan om kopiatorn inte fungerar.)'
                  else '(Write the tasks on the board if the copier is broken.)' end))
    from core;
$function$;
