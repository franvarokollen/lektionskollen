-- Feedback on autopilot.
--
-- The Feedback tab asked one coordinator to review every piece of extra help
-- every substitute ever asked for, and to read every plan's feedback for
-- themselves. That does not scale past a handful of lessons a week. So:
--
--   1. Extra help reviews itself. The substitute who asked for it says, right
--      there, whether it helped. A thumbs-down hides it. One that passes the
--      check is kept (on a thumbs-up at once, otherwise after a day with no
--      complaint). Only one that fails the check waits for a person.
--   2. Plans can have one step rewritten (an AI draft the person accepts):
--      lk_update_plan_body. The previous body is kept for undo, and the
--      approval goes stale on its own because the body's hash changes.
--
-- Which plans need a person is computed in the app from lk_feedback_overview,
-- so it needs nothing here.

alter table lektionskollen.plan_extras
  add column if not exists sub_verdict text,
  add column if not exists auto_reason text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'plan_extras_sub_verdict_ck') then
    alter table lektionskollen.plan_extras
      add constraint plan_extras_sub_verdict_ck check (sub_verdict is null or sub_verdict in ('up', 'down'));
  end if;
end $$;

alter table lektionskollen.plans
  add column if not exists body_prev jsonb,
  add column if not exists body_changed_at timestamptz,
  add column if not exists body_change_note text;

-- Is a piece of extra help usable? Same spirit as the plan check: something to
-- say or do, and no question without an answer.
create or replace function lektionskollen.extra_ok(p_body jsonb)
returns boolean language sql immutable as $$
  select p_body is not null and jsonb_typeof(p_body) = 'object'
     and (coalesce(jsonb_array_length(case when jsonb_typeof(p_body -> 'lines') = 'array' then p_body -> 'lines' end), 0) > 0
          or coalesce(btrim(p_body ->> 'board'), '') <> ''
          or coalesce(jsonb_array_length(case when jsonb_typeof(p_body -> 'tasks') = 'array' then p_body -> 'tasks' end), 0) > 0)
     and not exists (
       select 1 from jsonb_array_elements(case when jsonb_typeof(p_body -> 'tasks') = 'array' then p_body -> 'tasks' else '[]'::jsonb end) t
        where coalesce(btrim(t ->> 'q'), '') = '' or public.lk_is_pointer(t ->> 'a'));
$$;

-- The rule, in one place.
create or replace function lektionskollen.auto_review_extra(p_id bigint)
returns void language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare e lektionskollen.plan_extras;
begin
  select * into e from lektionskollen.plan_extras where id = p_id for update;
  if e.id is null or e.reviewed then return; end if;
  if e.sub_verdict = 'down' then
    update lektionskollen.plan_extras set reviewed = true, kept = false, reviewed_at = now(), auto_reason = 'sub_down' where id = p_id;
  elsif not lektionskollen.extra_ok(e.body) then
    update lektionskollen.plan_extras set auto_reason = 'check_failed' where id = p_id;   -- waits for a person
  elsif e.sub_verdict = 'up' or e.created_at < now() - interval '1 day' then
    update lektionskollen.plan_extras set reviewed = true, kept = true, reviewed_at = now(),
           auto_reason = case when e.sub_verdict = 'up' then 'sub_up' else 'no_complaint' end where id = p_id;
  end if;
end; $$;

-- The substitute's thumb, from the plan link.
create or replace function public.lk_extra_verdict_by_token(p_token text, p_extra_id bigint, p_up boolean)
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare n int;
begin
  update lektionskollen.plan_extras e set sub_verdict = case when p_up then 'up' else 'down' end
    from lektionskollen.plans p
   where e.id = p_extra_id and p.id = e.plan_id and p.share_token = p_token and p.approved
     and not e.reviewed;
  get diagnostics n = row_count;
  if n > 0 then perform lektionskollen.auto_review_extra(p_extra_id); end if;
  return n > 0;
end; $$;

-- Run the rule over the school's waiting extras. Called when the Feedback tab
-- opens, and nightly for everyone.
create or replace function public.lk_auto_review()
returns int language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare r record; n int := 0;
begin
  for r in select e.id from lektionskollen.plan_extras e join lektionskollen.plans p on p.id = e.plan_id
            where not e.reviewed and p.school_id = lektionskollen.current_school() loop
    perform lektionskollen.auto_review_extra(r.id); n := n + 1;
  end loop;
  return n;
end; $$;

create or replace function lektionskollen.auto_review_all()
returns void language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare r record;
begin
  for r in select id from lektionskollen.plan_extras where not reviewed loop
    perform lektionskollen.auto_review_extra(r.id);
  end loop;
end; $$;

create or replace function public.lk_nightly_retention()
returns void language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
begin
  update lektionskollen.cover_plans set url = null, note = null
   where expires_at < now() and (url is not null or note is not null);
  update lektionskollen.plan_uses set substitute = null, teacher_note = null
   where used_on < current_date - 90 and (substitute is not null or teacher_note is not null);
  update lektionskollen.ratings set comment = null
   where created_at < now() - interval '90 days' and comment is not null;
  update lektionskollen.section_feedback set note = null
   where created_at < now() - interval '90 days' and note is not null;
  update lektionskollen.linked_feedback set left_off = null
   where created_at < now() - interval '90 days' and left_off is not null;
  perform lektionskollen.auto_review_all();
end; $$;

-- Replace a plan's body with an edited one (an accepted AI fix). Own school
-- only. The old body is kept for one-step undo; approval goes stale by itself.
create or replace function public.lk_update_plan_body(p_id uuid, p_body jsonb, p_note text default null)
returns jsonb language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare r lektionskollen.plans;
begin
  if p_body is null or jsonb_typeof(p_body) <> 'object' or length(p_body::text) > 200000 then
    return jsonb_build_object('ok', false, 'error', 'bad_body');
  end if;
  update lektionskollen.plans
     -- The translation was of the old body; the app writes a new one.
     set body_prev = body, body = p_body, body_changed_at = now(), body_alt = null, language_alt = null,
         body_change_note = left(nullif(btrim(coalesce(p_note, '')), ''), 300),
         check_result = null, checked_at = null
   where id = p_id and school_id = lektionskollen.current_school()
   returning * into r;
  if r.id is null then return jsonb_build_object('ok', false, 'error', 'not_ours'); end if;
  return jsonb_build_object('ok', true,
    'check', public.lk_check_plan(r.body, r.minutes, r.language),
    'approval_rank', lektionskollen.live_rank(r.approved, r.approved_kind, r.approved_qualified, r.approved_sha, r.body));
end; $$;

grant execute on function public.lk_extra_verdict_by_token(text, bigint, boolean) to anon, authenticated;
grant execute on function public.lk_auto_review()                                to anon, authenticated;
grant execute on function public.lk_update_plan_body(uuid, jsonb, text)           to anon, authenticated;

-- The Feedback tab needs to see what the rule decided and why.
create or replace function public.lk_extras(p_id uuid)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb) from (
    select e.id, e.plan_id, e.section_ref, e.section_label, e.kind, e.variant, e.language, e.body, e.body_alt,
           e.language_alt, e.model, e.reviewed, e.kept, e.created_by_kind, e.created_at,
           e.sub_verdict, e.auto_reason, e.reviewed_at,
           p.title, p.subject, p.year_group
      from lektionskollen.plan_extras e join lektionskollen.plans p on p.id = e.plan_id
     where (p_id is null or e.plan_id = p_id)
       and p.school_id in (select school_id from lektionskollen.members where user_id = auth.uid()
                           union all select lektionskollen.demo_school())) x;
$$;
