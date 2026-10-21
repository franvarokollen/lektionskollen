-- Three tiers of task, all present at once.
--
-- The create-plan form used to ask the coordinator for a difficulty — Standard,
-- Adapted or Stretch. Two of those words mean nothing to anyone outside a
-- staffroom, and the question is the wrong one anyway: it asks someone who will
-- not be in the room to pick one level for thirty pupils who need three.
--
-- So the plan carries all three. Support, core and extension sit on the page
-- together, every one with its answer, and the substitute points a pupil at the
-- right one. The board and the printed handout show the core tier, because that
-- is what most of the class does and a board can only say one thing.
--
-- Pupils never see a tier name. The label is for the adult holding the plan.

create or replace function lektionskollen.tasks_of(b jsonb, p_tier text)
returns jsonb language sql immutable as $$
  select coalesce(jsonb_agg(x order by o), '[]'::jsonb)
    from jsonb_array_elements(coalesce(b -> 'tasks', '[]'::jsonb)) with ordinality as t(x, o)
   where coalesce(x ->> 'tier', 'core') = p_tier;
$$;

create or replace function lektionskollen.sim_plan(p_key text, p_lang text)
returns jsonb language sql stable as $$
  with built as (
    select lektionskollen.sim_assemble(
             (case when p_lang = 'sv' then sv else en end)
               || jsonb_build_object('first90', lektionskollen.sim_first90(
                    (case when p_lang = 'sv' then sv else en end) ->> 'subj', p_lang)),
             jsonb_build_object('su', subject, 'y', year_group, 'm', minutes),
             p_lang) as b
      from lektionskollen.sim_content where key = p_key),
  core as (select b, lektionskollen.tasks_of(b, 'core') as c from built)
  -- The assembler numbers every task onto the board and the handout. Once the
  -- plan carries three tiers that would put seven questions on a whiteboard, so
  -- both are narrowed to the core tier. The other two live on the plan.
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
$$;

-- ── Validation ───────────────────────────────────────────
-- The form now tells the coordinator the plan has three tiers. A promise the
-- plan does not keep is the fault this whole line of work exists to prevent,
-- so it is checked rather than hoped for.
create or replace function public.lk_validate_tiers(p_body jsonb)
returns jsonb language plpgsql immutable as $$
declare
  probs jsonb := '[]'::jsonb;
  x jsonb; i int := 0; seen text[] := '{}'; missing text[];
begin
  if jsonb_typeof(p_body -> 'tasks') <> 'array'
     or jsonb_array_length(p_body -> 'tasks') = 0 then
    return probs;   -- lk_validate_plan already blocks a plan with no tasks
  end if;

  for x in select * from jsonb_array_elements(p_body -> 'tasks') loop
    i := i + 1;
    if coalesce(x ->> 'tier', '') not in ('support', 'core', 'extension') then
      probs := probs || jsonb_build_object('level', 'blocker', 'code', 'task_no_tier',
        'where', 'task ' || i,
        'detail', 'This task is not marked support, core or extension, so the substitute cannot tell who it is for.');
    else
      seen := seen || (x ->> 'tier');
    end if;
  end loop;

  missing := array(select t from unnest(array['support','core','extension']) t
                    where not (t = any (seen)));
  if array_length(missing, 1) > 0 then
    probs := probs || jsonb_build_object('level', 'blocker', 'code', 'tier_missing',
      'where', 'tasks',
      'detail', 'No tasks at the ' || array_to_string(missing, ' or ') ||
                ' level, so a pupil who needs one has nothing to do.');
  end if;

  return probs;
end; $$;

create or replace function public.lk_validate_full(p_body jsonb, p_minutes int default null)
returns jsonb language sql immutable as $$
  with s as (select public.lk_validate_plan(p_body, p_minutes) v),
       t as (select public.lk_validate_teaching(p_body) v),
       r as (select public.lk_validate_tiers(p_body) v),
       p as (select ((select v -> 'problems' from s) || (select v from t) || (select v from r)) probs)
  select jsonb_build_object(
    'ok', not exists (select 1 from jsonb_array_elements(probs) x where x ->> 'level' = 'blocker'),
    'blockers', (select count(*) from jsonb_array_elements(probs) x where x ->> 'level' = 'blocker'),
    'warnings', (select count(*) from jsonb_array_elements(probs) x where x ->> 'level' = 'warn'),
    'problems', probs) from p;
$$;

grant execute on function lektionskollen.tasks_of(jsonb, text)  to service_role;
grant execute on function public.lk_validate_tiers(jsonb)       to anon, authenticated, service_role;
