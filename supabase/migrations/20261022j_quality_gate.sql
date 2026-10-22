-- A quality gate that runs on every plan, costs nothing, and cannot be argued with.
--
-- A line-by-line read of all 30 pool plans found faults none of the existing
-- checks could see, because each one is about whether the lesson makes sense
-- rather than whether a field is filled in:
--
--   a task that points at a text, article or page the plan never contains
--     ("the text you were given", "the article") - a substitute cannot run it;
--   a quoted sentence with no quote marks, so a question reads as gibberish
--     ("Is It is raining today an opinion or a fact?");
--   the same question asked twice, or an exit ticket that only repeats a
--     starter question and so tests nothing from the lesson.
--
-- All three are facts about the text. None needs a model, so none costs
-- anything, and a check that costs money is one somebody eventually turns off.
-- What a model is for - solving every question blind, and asking whether the
-- lesson actually taught what its questions need - stays in lk-verify, where
-- it is configured separately and skipped when no key is present.

alter table lektionskollen.plans
  add column if not exists archived_at     timestamptz,
  add column if not exists archived_reason text;

create or replace function public.lk_validate_quality(p_body jsonb, p_language text default null)
returns jsonb language plpgsql immutable as $$
declare
  probs jsonb := '[]'::jsonb;
  qs    jsonb := '[]'::jsonb;      -- [{w, q, kind}]
  x jsonb; ph jsonb; ck jsonb; i int; j int;
  q text; w text; seen text[] := '{}'; norm text; has_passage boolean := false;
  starters text[] := '{}';
  ref_always constant text :=
    '\m(texten|artikeln|novellen|dikten|diagrammet|tabellen|grafen|bilden|sidan|videon|filmen|arbetsbladet) (du|ni) (fick|har fått|får)\M'
    || '|\m(you were given|you got|you have been given)\M'
    || '|\mthe (text|article|page|passage|poem|chart|graph|table|worksheet) (you|we) ';
  ref_needs_text constant text :=
    '\m(i|ur|från) (texten|artikeln|novellen|dikten|diagrammet|tabellen)\M'
    || '|\m(in|from|of) the (text|article|passage|story|poem|chart|graph|table|picture|video)\M'
    || '|\m(summarise|summarize) the (article|text)\M'
    || '|\mwhat is the article about\M';
  quoted constant text := '[”“"‘’«»]';
begin
  if p_body is null or jsonb_typeof(p_body) <> 'object' then return probs; end if;

  -- Every question a pupil is asked, with where it lives.
  if jsonb_typeof(p_body -> 'tasks') = 'array' then
    i := 0;
    for x in select * from jsonb_array_elements(p_body -> 'tasks') loop
      i := i + 1; qs := qs || jsonb_build_object('w', 'task ' || i, 'q', coalesce(x ->> 'q', ''), 'kind', 'task');
    end loop;
  end if;
  if jsonb_typeof(p_body -> 'phases') = 'array' then
    i := 0;
    for ph in select * from jsonb_array_elements(p_body -> 'phases') loop
      i := i + 1; j := 0;
      if jsonb_typeof(ph -> 'checks') = 'array' then
        for ck in select * from jsonb_array_elements(ph -> 'checks') loop
          j := j + 1;
          qs := qs || jsonb_build_object('w', 'phase ' || i || ', check ' || j,
                                         'q', coalesce(ck ->> 'q', ''),
                                         'kind', case when i = 1 then 'starter' else 'check' end);
        end loop;
      end if;
    end loop;
  end if;
  if coalesce(p_body #>> '{model,p}', '') <> '' then
    qs := qs || jsonb_build_object('w', 'worked example', 'q', p_body #>> '{model,p}', 'kind', 'model'); end if;
  if coalesce(p_body #>> '{model,tq}', '') <> '' then
    qs := qs || jsonb_build_object('w', 'one together', 'q', p_body #>> '{model,tq}', 'kind', 'model'); end if;
  if coalesce(p_body #>> '{exit,q}', '') <> '' then
    qs := qs || jsonb_build_object('w', 'exit ticket', 'q', p_body #>> '{exit,q}', 'kind', 'exit'); end if;

  -- A question long enough to carry a passage means the text IS in the plan.
  for x in select * from jsonb_array_elements(qs) loop
    if length(x ->> 'q') > 220 then has_passage := true; end if;
  end loop;

  for x in select * from jsonb_array_elements(qs) loop
    q := x ->> 'q'; w := x ->> 'w';

    if q ~* ref_always or (not has_passage and q ~* ref_needs_text) then
      probs := probs || jsonb_build_object('level', 'blocker', 'code', 'phantom_reference', 'where', w,
        'detail', 'Refers to a text, page or picture that is not in the plan: "' || left(q, 90) ||
                  '". A substitute cannot run this - write the text out in the question.');
    end if;

    -- A sentence being discussed has to be in quote marks, or the question
    -- reads as one run-on sentence.
    if q !~ quoted and (
         q ~ '^(Är|Is) [^?]*\m(en åsikt|ett faktum|an opinion|a fact|ett påstående|a claim)\M'
      or q ~ '^(Gör om|Turn|Byt ut|Replace|Ge ett motargument mot|Give a counter-argument to) [A-ZÅÄÖa-zåäö]' and q !~ ':') then
      probs := probs || jsonb_build_object('level', 'blocker', 'code', 'unquoted_sentence', 'where', w,
        'detail', 'A quoted sentence has no quote marks, so the question is hard to read: "' || left(q, 90) || '"');
    end if;

    norm := lower(regexp_replace(q, '[^[:alnum:]]+', '', 'g'));
    if norm <> '' and (x ->> 'kind') = 'task' then
      if norm = any(seen) then
        probs := probs || jsonb_build_object('level', 'warn', 'code', 'duplicate_question', 'where', w,
          'detail', 'The same question is asked twice: "' || left(q, 90) || '"');
      end if;
      seen := seen || norm;
    end if;
    if (x ->> 'kind') = 'starter' then starters := starters || norm; end if;
  end loop;

  -- An exit ticket that only repeats a starter question tests nothing from
  -- the lesson itself.
  norm := lower(regexp_replace(coalesce(p_body #>> '{exit,q}', ''), '[^[:alnum:]]+', '', 'g'));
  if norm <> '' and norm = any(starters) then
    probs := probs || jsonb_build_object('level', 'warn', 'code', 'exit_repeats_starter', 'where', 'exit ticket',
      'detail', 'The exit question is one of the starter questions, so it tests nothing from this lesson.');
  end if;

  return probs;
end; $$;

-- Everything, in one verdict, now including the quality rules above.
create or replace function public.lk_check_plan(
  p_body jsonb, p_minutes integer default null, p_language text default null)
returns jsonb language sql immutable as $$
  with base as (select public.lk_validate_full(p_body, p_minutes) v),
       probs as (
         select ((select v -> 'problems' from base)
                 || public.lk_validate_board(p_body)
                 || public.lk_validate_language(p_body, p_language)
                 || public.lk_validate_quality(p_body, p_language)) p)
  select jsonb_build_object(
    'ok', not exists (select 1 from jsonb_array_elements(p) x where x ->> 'level' = 'blocker'),
    'blockers', (select count(*) from jsonb_array_elements(p) x where x ->> 'level' = 'blocker'),
    'warnings', (select count(*) from jsonb_array_elements(p) x where x ->> 'level' = 'warn'),
    'problems', p,
    'checked', 'auto') from probs;
$$;

grant execute on function public.lk_validate_quality(jsonb, text) to anon, authenticated;

-- Archived plans stay openable by link but leave the pool.
create or replace function public.lk_pool(
  p_subject text default null, p_year text default null,
  p_scope text default 'all', p_approval text default 'any')
returns jsonb
language sql stable security definer set search_path = lektionskollen, pg_temp as $$
  with me as (select lektionskollen.current_school() as sid),
  rows as (
    select p.id, p.title, p.body_alt->>'title' as title_alt, p.language, p.language_alt,
           p.subject, p.year_group, p.minutes,
           p.approved, p.shared, (p.school_id = (select sid from me)) as mine,
           lektionskollen.approval_label(p.approved_kind, p.approved_qualified) as approved_kind,
           p.approved_subject, p.approved_at, p.approved_name,
           lektionskollen.live_rank(p.approved, p.approved_kind, p.approved_qualified,
                                    p.approved_sha, p.body) as approval_rank,
           (p.approved and p.approved_sha is not null
            and p.approved_sha <> lektionskollen.plan_sha(p.body)) as approval_stale,
           round(coalesce(avg(r.score), 0)::numeric, 1) as rating,
           count(r.id)::int as rating_count,
           p.share_token, p.created_at, s.name as school
      from lektionskollen.plans p
      join lektionskollen.schools s on s.id = p.school_id
      left join lektionskollen.ratings r on r.plan_id = p.id and r.would_reuse is not null
     where (p.school_id = (select sid from me) or p.shared)
       and p.archived_at is null
       and (p_subject is null or p.subject = p_subject)
       and (p_year    is null or p.year_group = p_year)
       and (p_scope = 'all'
            or (p_scope = 'mine'   and p.school_id = (select sid from me))
            or (p_scope = 'shared' and p.shared))
       and (coalesce(p_approval, 'any') = 'any'
            or (p_approval = 'approved' and p.approved)
            or (p_approval = 'teacher'
                and lektionskollen.live_rank(p.approved, p.approved_kind, p.approved_qualified,
                                             p.approved_sha, p.body) >= 2)
            or (p_approval = 'qualified'
                and lektionskollen.live_rank(p.approved, p.approved_kind, p.approved_qualified,
                                             p.approved_sha, p.body) >= 3))
     group by p.id, s.name
  ), scored as (
    select r.*, public.lk_plan_standing(r.id) as st from rows r
  ), k as (
    select s.*, ((s.st->>'n')::int = 0) as is_new from scored s
  ), proven as (
    select id, row_number() over (
             order by ((st->>'score')::numeric
                       + (case approval_rank when 3 then 0.10 when 2 then 0.05 else 0 end)
                         * 5.0 / (5 + (st->>'n')::int)) desc nulls last,
                      created_at desc) as i
      from k where approved and not is_new
  ), fresh as (
    select id, row_number() over (order by approval_rank desc, created_at desc) as j
      from k where approved and is_new
  ), keyed as (
    select k.*,
           case when not k.approved then 1000000
                when k.is_new then 4 * f.j + 0.5
                else pr.i end as rk
      from k
      left join proven pr on pr.id = k.id
      left join fresh  f  on f.id  = k.id
  )
  select coalesce(jsonb_agg(to_jsonb(x) - 'rk' order by x.rk), '[]'::jsonb) from keyed x;
$$;
grant execute on function public.lk_pool(text, text, text, text) to anon, authenticated;

-- Approval is refused while the checker finds a blocking fault.
create or replace function public.lk_approve_as(
  p_id uuid, p_kind text, p_subject text, p_name text)
returns jsonb
language plpgsql security definer set search_path = lektionskollen, pg_temp as $$
declare
  cur  lektionskollen.plans;
  r    lektionskollen.plans;
  want int  := case p_kind when 'coordinator' then 1 when 'teacher' then 2
                            when 'qualified' then 3 else 0 end;
  have int;
  who  text := nullif(btrim(coalesce(p_name, '')), '');
begin
  if want = 0 then return jsonb_build_object('ok', false, 'error', 'bad_kind'); end if;
  if who is null or char_length(who) < 2 or char_length(who) > 80 then
    return jsonb_build_object('ok', false, 'error', 'name_required');
  end if;

  select * into cur from lektionskollen.plans
   where id = p_id and school_id = lektionskollen.current_school()
   for update;
  if cur.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  -- A plan with a blocking fault cannot be approved: the checker has already
  -- found something a person would have to read the whole plan to notice, and
  -- approving it would put that in front of a substitute with a signature on it.
  -- Checked live, not from the stored verdict, because the body may have changed.
  if (public.lk_check_plan(cur.body, cur.minutes, cur.language) ->> 'blockers')::int > 0 then
    return jsonb_build_object('ok', false, 'error', 'has_blockers');
  end if;

  have := lektionskollen.live_rank(cur.approved, cur.approved_kind,
                                   cur.approved_qualified, cur.approved_sha, cur.body);
  if have >= 3 then
    return jsonb_build_object('ok', false, 'error', 'gate_closed',
             'kind', lektionskollen.approval_label(cur.approved_kind, cur.approved_qualified),
             'name', cur.approved_name);
  end if;
  if have >= want then
    return jsonb_build_object('ok', false, 'error', 'already_approved', 'rank', have,
             'kind', lektionskollen.approval_label(cur.approved_kind, cur.approved_qualified),
             'name', cur.approved_name);
  end if;

  update lektionskollen.plans
     set approved = true,
         approved_by = auth.uid(),
         approved_at = now(),
         approved_kind = case when want >= 2 then 'teacher' else 'coordinator' end,
         approved_qualified = (want = 3),
         approved_name = who,
         -- Teacher and qualified both say which subject the approver is
         -- qualified in; defaulting to the plan's own subject is the common
         -- case and the one that cannot be wrong.
         approved_subject = case when want >= 2
                                 then coalesce(nullif(btrim(p_subject), ''), subject)
                                 else null end,
         approved_sha = lektionskollen.plan_sha(body)
   where id = p_id
   returning * into r;

  return jsonb_build_object('ok', true, 'rank', want,
           'kind', lektionskollen.approval_label(r.approved_kind, r.approved_qualified),
           'name', r.approved_name, 'subject', r.approved_subject, 'at', r.approved_at);
end; $$;
grant execute on function public.lk_approve_as(uuid, text, text, text) to anon, authenticated;

-- lk-verify now runs the whole deterministic verdict, which needs the language.
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
            'minutes', p.minutes, 'model', p.model, 'language', p.language)
            from lektionskollen.plans p where p.id = p_id);
end; $$;
