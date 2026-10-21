-- The second half of validation: not "is anything missing" but "does this
-- actually teach". lk_validate_plan checks the structure; this checks the
-- teaching, and between them they make the three faults found in the audit
-- impossible to ship again.
create or replace function public.lk_validate_teaching(p_body jsonb)
returns jsonb language plpgsql immutable as $$
declare
  probs jsonb := '[]'::jsonb;
  st jsonb; mc jsonb; q jsonb; ph jsonb;
  i int := 0;
  exit_q text; task1 text; says text;
begin
  if p_body is null or jsonb_typeof(p_body) <> 'object' then return probs; end if;

  -- Rosenshine 4. A lesson with practice but no model asks a substitute who
  -- may not know the subject to invent the explanation on the spot.
  if p_body -> 'model' is null or jsonb_typeof(p_body -> 'model') <> 'object' then
    probs := probs || jsonb_build_object('level','warn','code','no_model','where','model',
      'detail','No worked example. The substitute has nothing to model before pupils practise.');
  else
    if public.lk_is_pointer(p_body #>> '{model,a}') then
      probs := probs || jsonb_build_object('level','blocker','code','model_no_answer','where','model',
        'detail','The worked example has no answer.');
    end if;
    if jsonb_typeof(p_body #> '{model,st}') <> 'array'
       or jsonb_array_length(p_body #> '{model,st}') < 2 then
      probs := probs || jsonb_build_object('level','blocker','code','model_no_steps','where','model',
        'detail','The worked example is not worked — it needs at least two steps.');
    else
      for st in select * from jsonb_array_elements(p_body #> '{model,st}') loop
        i := i + 1;
        if coalesce(btrim(st ->> 'b'), '') = '' and coalesce(btrim(st ->> 's'), '') = '' then
          probs := probs || jsonb_build_object('level','blocker','code','model_step_empty',
            'where','model, step ' || i, 'detail','This step says neither what to write nor what to say.');
        end if;
      end loop;
    end if;
    if coalesce(btrim(p_body #>> '{model,tq}'), '') <> ''
       and public.lk_is_pointer(p_body #>> '{model,ta}') then
      probs := probs || jsonb_build_object('level','blocker','code','together_no_answer','where','model',
        'detail','The "one together" question has no answer.');
    end if;
  end if;

  -- Rosenshine 1. Recall must be about what came BEFORE. The audit found the
  -- opening question identical to the exit ticket, which asks pupils to do the
  -- thing the lesson has not taught yet.
  exit_q := btrim(coalesce(p_body #>> '{exit,q}', ''));
  task1  := btrim(coalesce(p_body #>> '{tasks,0,q}', ''));

  if p_body -> 'recall' is null then
    probs := probs || jsonb_build_object('level','warn','code','no_recall','where','recall',
      'detail','No recap of prior learning to open the lesson with.');
  else
    i := 0;
    for q in select * from jsonb_array_elements(coalesce(p_body #> '{recall,qs}', '[]'::jsonb)) loop
      i := i + 1;
      if public.lk_is_pointer(q ->> 'a') then
        probs := probs || jsonb_build_object('level','blocker','code','recall_no_answer',
          'where','recall, question ' || i, 'detail','This recap question has no answer.');
      end if;
      if exit_q <> '' and btrim(q ->> 'q') = exit_q then
        probs := probs || jsonb_build_object('level','blocker','code','recall_is_exit',
          'where','recall, question ' || i,
          'detail','The recap asks the same question as the exit ticket, so the lesson opens by asking pupils to do what it has not taught yet.');
      end if;
    end loop;
  end if;

  -- The exit ticket is meant to measure the lesson, not repeat its first task.
  if exit_q <> '' and task1 <> '' and exit_q = task1 then
    probs := probs || jsonb_build_object('level','blocker','code','exit_is_task','where','exit',
      'detail','The exit ticket is identical to task 1, so it measures nothing new.');
  end if;

  -- EEF: the wrong answer pupils actually give, and the sentence that fixes it.
  if jsonb_typeof(p_body -> 'misconceptions') <> 'array'
     or jsonb_array_length(p_body -> 'misconceptions') = 0 then
    probs := probs || jsonb_build_object('level','warn','code','no_misconceptions','where','misconceptions',
      'detail','No common misconception listed, so the substitute cannot tell a normal wrong answer from a worrying one.');
  else
    i := 0;
    for mc in select * from jsonb_array_elements(p_body -> 'misconceptions') loop
      i := i + 1;
      if coalesce(btrim(mc ->> 's'), '') = '' then
        probs := probs || jsonb_build_object('level','blocker','code','misconception_no_fix',
          'where','misconception ' || i, 'detail','This names a wrong answer but not what to say about it.');
      end if;
    end loop;
  end if;

  -- The fault that started all of this: the plan tells the substitute to produce
  -- something that is not in the plan.
  says := '';
  for ph in select * from jsonb_array_elements(coalesce(p_body -> 'phases', '[]'::jsonb)) loop
    says := says || ' ' || coalesce(ph ->> 'say', '');
  end loop;
  if says ~* '(visar ett exempel|jag räknar ett exempel|show you an example|work through one example|I.ll show)'
     and p_body -> 'model' is null then
    probs := probs || jsonb_build_object('level','blocker','code','promised_example_missing','where','script',
      'detail','The script tells the substitute to show an example, but the plan contains no worked example.');
  end if;

  -- Where the handouts physically are. The commonest real-world sub-plan failure.
  if coalesce(btrim(p_body #>> '{equipment,where}'), '') = '' then
    probs := probs || jsonb_build_object('level','warn','code','no_where','where','equipment',
      'detail','Does not say where the materials actually are in the room.');
  end if;

  return probs;
end; $$;

-- Structure and teaching together. This is what the verifier and the app call.
create or replace function public.lk_validate_full(p_body jsonb, p_minutes int default null)
returns jsonb language sql immutable as $$
  with s as (select public.lk_validate_plan(p_body, p_minutes) v),
       t as (select public.lk_validate_teaching(p_body) v),
       p as (select ((select v -> 'problems' from s) || (select v from t)) probs)
  select jsonb_build_object(
    'ok', not exists (select 1 from jsonb_array_elements(probs) x where x ->> 'level' = 'blocker'),
    'blockers', (select count(*) from jsonb_array_elements(probs) x where x ->> 'level' = 'blocker'),
    'warnings', (select count(*) from jsonb_array_elements(probs) x where x ->> 'level' = 'warn'),
    'problems', probs) from p;
$$;

grant execute on function public.lk_validate_teaching(jsonb)  to anon, authenticated, service_role;
grant execute on function public.lk_validate_full(jsonb, int) to anon, authenticated, service_role;
