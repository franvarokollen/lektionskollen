-- Quality that does not depend on the coordinator being a chemist.
--
-- The complaint that prompted this: "the instructions say check the answer key,
-- but there is none." A substitute with no subject knowledge, in front of a
-- class, holding a plan that refers to something that does not exist. That is
-- the situation this product exists to prevent, and nothing was positioned to
-- catch it — because the only human asked to approve a plan is the one least
-- able to judge its content.
--
-- Four changes, which belong together:
--   lk_is_pointer      an answer that only points at another answer
--   lk_validate_plan   every structural fault a machine can find
--   teacher review     the one person who can judge the subject, finally asked
--   should_share       both of those now decide whether a plan stays in the pool
--
-- Subject correctness is checked separately by the lk-verify function.

-- ── An answer that is not an answer ──────────────────────
-- Length is deliberately not a test: "5" is a complete answer in mathematics.
create or replace function public.lk_is_pointer(p text)
returns boolean language sql immutable as $$
  select p is null
      or btrim(p) = ''
      or btrim(p) ~* '^(todo|tbd|n/?a|\?+|\.{2,}|-+|—+)$'
      or btrim(p) ~* '(se facit|se svaret|se lärarens|se läraren|enligt facit|facit:? se|se uppgiftslistan|se nedan|se ovan)'
      or btrim(p) ~* '(see the answer|see answer key|see the key|see teacher|teacher''s note|see below|see above|as above|refer to)';
$$;

-- ── Everything checkable without knowing the subject ─────
-- Blockers mean the plan is not fit to send. Warnings are worth a look.
create or replace function public.lk_validate_plan(p_body jsonb, p_minutes int default null)
returns jsonb language plpgsql immutable as $$
declare
  probs jsonb := '[]'::jsonb;
  ph jsonb; ck jsonb; tk jsonb; mt jsonb;
  i int := 0; j int;
  mins_total int := 0; a int; b int; t text;
  add_blocker constant text := 'blocker';
  add_warn    constant text := 'warn';
begin
  if p_body is null or jsonb_typeof(p_body) <> 'object' then
    return jsonb_build_object('ok', false, 'blockers', 1, 'warnings', 0,
      'problems', jsonb_build_array(jsonb_build_object(
        'level', add_blocker, 'code', 'no_body', 'where', 'plan',
        'detail', 'The plan has no content.')));
  end if;

  -- The things a substitute reads first, and cannot do without.
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
  if jsonb_typeof(p_body -> 'first90') <> 'array' or jsonb_array_length(p_body -> 'first90') = 0 then
    probs := probs || jsonb_build_object('level', add_warn, 'code', 'no_first90',
      'where', 'first90', 'detail', 'No opening steps for the first ninety seconds.');
  end if;
  if coalesce(btrim(p_body #>> '{equipment,need}'), '') = '' then
    probs := probs || jsonb_build_object('level', add_warn, 'code', 'no_equipment',
      'where', 'equipment', 'detail', 'Does not say what the substitute needs.');
  end if;

  -- Phases: the lesson's spine.
  if jsonb_typeof(p_body -> 'phases') <> 'array' or jsonb_array_length(p_body -> 'phases') = 0 then
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
      -- Every check question needs an answer that is an answer.
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
      -- Times, when written as 00:00–00:15
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

  -- Tasks and their answers: what the class actually does.
  if jsonb_typeof(p_body -> 'tasks') <> 'array' or jsonb_array_length(p_body -> 'tasks') = 0 then
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

  -- The exit ticket is the last thing that happens; it needs an answer too.
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

  -- What to do when it goes wrong: the part an untrained substitute needs most.
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

-- ── The class teacher's verdict ──────────────────────────
-- Per delivery, not per plan: the same lesson can be right for 7A and wrong
-- for 7C, and "was this right for MY class" is a question about one lesson.
alter table lektionskollen.plan_uses add column if not exists teacher_token text;
alter table lektionskollen.plan_uses add column if not exists teacher_verdict text
  check (teacher_verdict in ('right', 'mostly', 'wrong'));
alter table lektionskollen.plan_uses add column if not exists teacher_note text;
alter table lektionskollen.plan_uses add column if not exists teacher_at timestamptz;

update lektionskollen.plan_uses
   set teacher_token = encode(gen_random_bytes(9), 'hex') where teacher_token is null;
alter table lektionskollen.plan_uses
  alter column teacher_token set default encode(gen_random_bytes(9), 'hex');
create unique index if not exists plan_uses_teacher_token on lektionskollen.plan_uses (teacher_token);

-- What the teacher opens: the plan as delivered, plus what the substitute said.
create or replace function public.lk_teacher_view(p_token text)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(to_jsonb(x), 'null'::jsonb) from (
    select u.group_name, u.used_on, u.substitute, u.teacher_verdict, u.teacher_note,
           p.id as plan_id, p.title, p.subject, p.year_group, p.minutes,
           p.body, p.body_alt, p.language, p.language_alt, p.model,
           s.name as school,
           (select jsonb_agg(jsonb_build_object('coverage', r.coverage, 'left_off', r.left_off,
                                                'comment', r.comment, 'at', r.created_at)
                    order by r.created_at desc)
              from lektionskollen.ratings r
             where r.plan_id = p.id and r.rater_kind = 'vikarie'
               and (r.coverage is not null or r.comment is not null)) as substitute_said
      from lektionskollen.plan_uses u
      join lektionskollen.plans p on p.id = u.plan_id
      join lektionskollen.schools s on s.id = u.school_id
     where u.teacher_token = p_token) x;
$$;

-- Three answers, because a class teacher reading this between lessons will
-- give three and not thirty.
create or replace function public.lk_teacher_verdict(
  p_token text, p_verdict text default null, p_note text default null)
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
begin
  if p_verdict is not null and p_verdict not in ('right', 'mostly', 'wrong') then
    return false;
  end if;
  update lektionskollen.plan_uses
     set teacher_verdict = coalesce(p_verdict, teacher_verdict),
         teacher_note = coalesce(nullif(btrim(p_note), ''), teacher_note),
         teacher_at = now()
   where teacher_token = p_token;
  return found;
end; $$;

create or replace function public.lk_teacher_flags(p_plan uuid)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select jsonb_build_object(
    'right',  count(*) filter (where teacher_verdict = 'right'),
    'mostly', count(*) filter (where teacher_verdict = 'mostly'),
    'wrong',  count(*) filter (where teacher_verdict = 'wrong'),
    'notes',  coalesce(jsonb_agg(jsonb_build_object('verdict', teacher_verdict, 'note', teacher_note,
                                                    'group', group_name, 'at', teacher_at)
                        order by teacher_at desc) filter (where teacher_note is not null), '[]'::jsonb))
    from lektionskollen.plan_uses where plan_id = p_plan and teacher_verdict is not null;
$$;

-- The lektionskollen schema is deliberately not exposed to PostgREST — every
-- route in is a public.lk_* function. The verifier needs a plan's body, so it
-- gets a door of its own, and only the service role may open it.
create or replace function public.lk_plan_for_verify(p_id uuid)
returns jsonb language plpgsql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare caller text;
begin
  caller := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  if caller is distinct from 'service_role' then
    raise exception 'service role only';
  end if;
  return (select jsonb_build_object(
            'body', p.body, 'subject', p.subject, 'year_group', p.year_group,
            'minutes', p.minutes, 'model', p.model)
            from lektionskollen.plans p where p.id = p_id);
end; $$;

-- ── Which faults keep a plan out of the pool ─────────────
-- A subject teacher saying the content is wrong outranks every substitute who
-- found it easy to deliver: a lesson that runs smoothly and teaches the wrong
-- thing is worse than one nobody could deliver, because the class leaves
-- confidently misinformed and nobody notices for weeks.
create or replace function lektionskollen.should_share(p_id uuid)
returns boolean language sql stable
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce((select approved from lektionskollen.plans where id = p_id), false)
     and not coalesce((s->>'burnt')::boolean, false)
     and not (coalesce((s->>'n')::int, 0) >= 3 and coalesce((s->>'score')::numeric, 1) < 0.40)
     and coalesce((f->>'wrong')::int, 0) = 0
     and coalesce((v->>'ok')::boolean, true)
    from (select public.lk_plan_standing(p_id) as s,
                 public.lk_teacher_flags(p_id) as f,
                 (select public.lk_validate_plan(body, minutes)
                    from lektionskollen.plans where id = p_id) as v) q;
$$;

update lektionskollen.plans p set shared = lektionskollen.should_share(p.id) where p.approved;

grant execute on function public.lk_is_pointer(text)                  to anon, authenticated, service_role;
grant execute on function public.lk_validate_plan(jsonb, int)         to anon, authenticated, service_role;
grant execute on function public.lk_teacher_view(text)                to anon, authenticated, service_role;
grant execute on function public.lk_teacher_verdict(text,text,text)   to anon, authenticated, service_role;
grant execute on function public.lk_teacher_flags(uuid)               to anon, authenticated, service_role;
grant execute on function public.lk_plan_for_verify(uuid)             to service_role;
