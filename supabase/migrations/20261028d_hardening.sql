-- Hardening, from an independent review of the live database (2026-10-28).
-- Needs 20261028a–c. Every change here is either a bug fix, a scope fix, or
-- dead code going; nothing changes what a coordinator sees in the demo.
--
--  1. Sharing on approval was decided by a BEFORE trigger that read the plan
--     back from the table — where it was still unapproved — so a first
--     approval always left the plan unshared. Now an AFTER trigger.
--  2. Plan quota refunds could be called by anyone, as often as they liked:
--     unlimited generations. Refunds are now the edge function's job only.
--  3. Extra help for substitutes is metered in the database before the model
--     is called (lk_assist_take), not counted afterwards from rows the page
--     may or may not save.
--  4. Several functions answered for any plan id, including other schools':
--     substitutes' notes, class names, feedback. They are internal now, or
--     scoped to the caller's school.
--  5. Deliveries are filed under the school that gave the lesson, and a run
--     token is only handed back to that school.
--  6. Cover links must be web addresses (a stored javascript: URL ran on the
--     substitute's page). Existing rows are not touched: NOT VALID.
--  7. Dead functions and duplicate overloads go; two indexes are added for
--     lookups that run on every screen; one duplicate index goes.
--  8. A plan edited after approval is not shared until approved again.

-- ── 1. Share on approval, after the fact ───────────────────────────────
-- should_share also says no while an approval is stale (the plan was edited
-- after it was approved), and runs as definer: the per-plan readers it uses
-- are no longer callable from the API (section 4).
create or replace function lektionskollen.should_share(p_id uuid)
returns boolean language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce((select approved and (approved_sha is null or approved_sha = lektionskollen.plan_sha(body))
                     from lektionskollen.plans where id = p_id), false)
     and coalesce(lektionskollen.share_allowed(p_id), false)
     and not coalesce((s->>'burnt')::boolean, false)
     and not (coalesce((s->>'n')::int, 0) >= 3 and coalesce((s->>'score')::numeric, 1) < 0.40)
     and coalesce((f->>'wrong')::int, 0) = 0
     and coalesce((v->>'ok')::boolean, true)
    from (select public.lk_plan_standing(p_id) as s,
                 public.lk_teacher_flags(p_id) as f,
                 (select public.lk_validate_plan(body, minutes)
                    from lektionskollen.plans where id = p_id) as v) q;
$$;
revoke all on function lektionskollen.should_share(uuid) from public, anon, authenticated;

drop trigger if exists share_on_approve on lektionskollen.plans;
drop function if exists lektionskollen.share_on_approve();

create or replace function lektionskollen.share_after_approve()
returns trigger language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare want boolean;
begin
  -- Runs after the row is written, so should_share sees the plan as it is now.
  want := coalesce(lektionskollen.should_share(new.id), false);
  if want is distinct from new.shared then
    -- Only `shared` changes, so this update does not meet the WHEN below again.
    update lektionskollen.plans set shared = want where id = new.id;
  end if;
  return null;
end; $$;

create trigger share_after_approve after update on lektionskollen.plans
  for each row
  when (new.approved is distinct from old.approved
        or new.approved_sha is distinct from old.approved_sha
        or new.share_allowed is distinct from old.share_allowed
        or new.body is distinct from old.body)
  execute function lektionskollen.share_after_approve();

-- The 18 plans the old trigger left unshared, and anything else that drifted.
-- `shared` is derived state, not an approval; nothing a person chose changes.
update lektionskollen.plans p set shared = coalesce(lektionskollen.should_share(p.id), false)
 where p.shared is distinct from coalesce(lektionskollen.should_share(p.id), false);

-- ── 2. Plan quota: the refund belongs to the edge function ─────────────
-- lk_quota_take now also says which school it charged, so the function can
-- refund exactly that, with the service role, and nobody else can.
create or replace function public.lk_quota_take(p_kind text, p_ref uuid default null)
returns jsonb language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare
  sid uuid := lektionskollen.current_school();
  lim int;
  got int;
begin
  if sid is null then
    return jsonb_build_object('ok', false, 'reason', 'no_school');
  end if;
  if p_kind <> 'plan' then
    return jsonb_build_object('ok', false, 'reason', 'bad_kind');
  end if;
  lim := (public.lk_quota_limits() ->> 'plans_per_day')::int;
  insert into lektionskollen.usage_day (school_id, on_day, kind, ref, n)
  values (sid, current_date, 'plan', '00000000-0000-0000-0000-000000000000'::uuid, 1)
  on conflict (school_id, on_day, kind, ref) do update
     set n = lektionskollen.usage_day.n + 1
   where lektionskollen.usage_day.n < lim
  returning n into got;
  if got is null then
    return jsonb_build_object('ok', false, 'reason', 'limit', 'kind', 'plan',
      'limit', lim, 'resets_at', (current_date + 1)::timestamptz);
  end if;
  return jsonb_build_object('ok', true, 'used', got, 'limit', lim, 'school', sid);
end; $$;

drop function if exists public.lk_quota_give_back(text, uuid);
create or replace function public.lk_quota_refund(p_school uuid, p_kind text default 'plan')
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
begin
  update lektionskollen.usage_day set n = greatest(0, n - 1)
   where school_id = p_school and on_day = current_date and kind = p_kind
     and ref = '00000000-0000-0000-0000-000000000000'::uuid;
  return found;
end; $$;
revoke all on function public.lk_quota_refund(uuid, text) from public, anon, authenticated;
grant execute on function public.lk_quota_refund(uuid, text) to service_role;

-- ── 3. Extra help: metered before the model, by share token ────────────
-- By share token (the substitute's page: approved plans only) or by plan id
-- (the coordinator's preview: their own school's plans only).
create or replace function public.lk_assist_take(p_token text default null, p_plan uuid default null)
returns jsonb language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare pid uuid; sid uuid; cap int; got int;
begin
  if p_token is not null then
    select id, school_id into pid, sid from lektionskollen.plans
     where share_token = p_token and approved;
  elsif p_plan is not null then
    select id, school_id into pid, sid from lektionskollen.plans
     where id = p_plan and school_id = lektionskollen.current_school();
  end if;
  if pid is null then return jsonb_build_object('ok', false, 'reason', 'no_plan'); end if;
  cap := coalesce((select assist_cap from lektionskollen.school_settings where school_id = sid), 20);
  if cap = -1 then return jsonb_build_object('ok', true); end if;
  insert into lektionskollen.usage_day (school_id, on_day, kind, ref, n)
  values (sid, current_date, 'assist', pid, 1)
  on conflict (school_id, on_day, kind, ref) do update
     set n = lektionskollen.usage_day.n + 1
   where lektionskollen.usage_day.n < cap
  returning n into got;
  if got is null then return jsonb_build_object('ok', false, 'reason', 'limit'); end if;
  return jsonb_build_object('ok', true, 'left', cap - got);
end; $$;
grant execute on function public.lk_assist_take(text, uuid) to anon, authenticated;

-- ── 4. Per-plan readers: internal, or the caller's school only ──────────
-- The app never calls these; other definer functions do (should_share,
-- lk_pool, lk_feedback_overview), and they keep working without the grant.
revoke execute on function public.lk_plan_standing(uuid)  from public, anon, authenticated;
revoke execute on function public.lk_teacher_flags(uuid)  from public, anon, authenticated;
revoke execute on function public.lk_plan_feedback(uuid)  from public, anon, authenticated;
revoke execute on function public.lk_section_feedback(uuid) from public, anon, authenticated;

-- A translation may only be written into one's own school's plan.
create or replace function public.lk_fill_alt(p_id uuid, p_language text, p_body jsonb)
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
begin
  if p_body is null or jsonb_typeof(p_body) <> 'object' or length(p_body::text) > 200000 then return false; end if;
  update lektionskollen.plans
     set body_alt = p_body, language_alt = p_language
   where id = p_id and body_alt is null and p_language <> language
     and school_id = lektionskollen.current_school();
  return found;
end; $$;

-- A coordinator rating is about one's own school's plan, or one shared with it.
create or replace function public.lk_rate_v2(p_id uuid, p_reuse boolean, p_reasons text[] default '{}')
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
begin
  if not exists (select 1 from lektionskollen.plans
                  where id = p_id and (school_id = lektionskollen.current_school() or shared)) then
    return false;
  end if;
  insert into lektionskollen.ratings (plan_id, rater_kind, user_id, score, would_reuse, reasons)
  values (p_id, 'coordinator', auth.uid(), case when p_reuse then 5 else 2 end,
          p_reuse, coalesce(p_reasons, '{}'));
  return true;
end; $$;

-- ── 5. Deliveries belong to the school that gave the lesson ────────────
create or replace function public.lk_log_run(
  p_plan_id uuid, p_group text, p_time text default null, p_absence_ref text default null,
  p_substitute text default null, p_on date default current_date)
returns jsonb language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare sid uuid := lektionskollen.current_school(); r record;
begin
  if sid is null or coalesce(btrim(p_group), '') = '' then return null; end if;
  -- Own plans, or plans shared with everyone. Nothing else is ours to log.
  if not exists (select 1 from lektionskollen.plans
                  where id = p_plan_id and (school_id = sid or shared)) then
    return null;
  end if;
  insert into lektionskollen.plan_uses
         (plan_id, school_id, group_name, used_on, absence_ref, substitute, lesson_time, expires_at)
  values (p_plan_id, sid, btrim(p_group), p_on, p_absence_ref, nullif(btrim(p_substitute), ''),
          nullif(btrim(p_time), ''), ((p_on + 2)::timestamp at time zone 'Europe/Stockholm'))
  on conflict (plan_id, group_name, used_on) do update
     set lesson_time = coalesce(excluded.lesson_time, lektionskollen.plan_uses.lesson_time),
         substitute  = coalesce(excluded.substitute,  lektionskollen.plan_uses.substitute),
         absence_ref = coalesce(excluded.absence_ref, lektionskollen.plan_uses.absence_ref)
   -- Another school's run with the same class name keeps its row and its token.
   where lektionskollen.plan_uses.school_id = sid
  returning run_token, expires_at into r;
  if r.run_token is null then return null; end if;
  return jsonb_build_object('run_token', r.run_token, 'expires_at', r.expires_at);
end; $$;

-- When an absence has had more than one plan made for it, the approved one,
-- then the newest, is the plan — not whichever the aggregate met last.
create or replace function public.lk_cover_plans()
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(jsonb_object_agg(x.absence_ref, x.state), '{}'::jsonb) from (
    select distinct on (r.absence_ref) r.absence_ref,
           jsonb_build_object('kind', 'generated', 'plan_id', p.id, 'title', p.title,
                              'approved', p.approved, 'share_token', p.share_token) as state
      from lektionskollen.plans p
      join lektionskollen.requests r on r.id = p.request_id
     where r.absence_ref is not null
       and p.school_id in (select school_id from lektionskollen.members where user_id = auth.uid()
                           union all select lektionskollen.demo_school())
     order by r.absence_ref, p.approved desc, p.created_at desc
  ) x
  union all
  select coalesce(jsonb_object_agg(c.absence_ref,
           jsonb_build_object('kind', c.kind, 'url', c.url, 'note', c.note,
                              'label', c.label, 'share_token', c.share_token,
                              'expires_at', c.expires_at, 'expired', c.expires_at < now())), '{}'::jsonb)
    from lektionskollen.cover_plans c
   where c.school_id in (select school_id from lektionskollen.members where user_id = auth.uid()
                         union all select lektionskollen.demo_school())
     and not exists (
       select 1 from lektionskollen.plans p
         join lektionskollen.requests r on r.id = p.request_id
        where r.absence_ref = c.absence_ref and p.school_id = c.school_id)
$$;

-- ── 6. Cover links are web addresses ───────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'cover_plans_url_http_ck') then
    alter table lektionskollen.cover_plans
      add constraint cover_plans_url_http_ck check (url is null or url ~* '^https?://') not valid;
  end if;
end $$;

-- ── 7. Dead code and duplicate overloads ───────────────────────────────
-- Zero callers in the app, the edge functions, other SQL, triggers or cron.
drop function if exists public.lk_join(text);
drop function if exists public.lk_approve(uuid);                   -- calls the 3-arg lk_approve_as
drop function if exists public.lk_approve_as(uuid, text, text);
drop function if exists public.lk_bank_ranked(text, text, text);   -- calls lk_bank, so first
drop function if exists public.lk_bank(text, text, text);
drop function if exists public.lk_bank_list(text, text, text);
drop function if exists public.lk_log_use(uuid, text, text, text, date);
drop function if exists public.lk_plan_approval(uuid);
drop function if exists public.lk_plan_heat(uuid);
drop function if exists public.lk_quota_state();
drop function if exists public.lk_rank_score(integer, integer, integer, numeric, numeric);
drop function if exists public.lk_rate(uuid, integer, text);
drop function if exists public.lk_rate_by_token(text, integer, text);
drop function if exists public.lk_rate_by_token_v2(text, boolean, text[]);
drop function if exists public.lk_rating_quality(text, text, text);
drop function if exists public.lk_share_state(uuid);
drop function if exists public.lk_share_bar();
drop function if exists public.lk_share_floor();
drop function if exists public.lk_share_confidence(integer, integer);
drop function if exists public.lk_term_ahead(text, text, integer, integer);
drop function if exists public.lk_assist_quota_by_plan(uuid);  -- lk-assist uses lk_assist_take
drop function if exists public.lk_plan_for_verify(uuid);       -- lk-verify reads lk_plan as the caller
-- Overloads the app does not use, one of which made lk_save_plan ambiguous.
drop function if exists public.lk_save_plan(jsonb, jsonb, text);
drop function if exists public.lk_assist_save(text, text, text, text, text, text, jsonb, text);
drop function if exists public.lk_rate_aspects_by_token(text, text, text, text);

-- ── Indexes ─────────────────────────────────────────────────────────────
create index if not exists requests_school_absence_idx on lektionskollen.requests (school_id, absence_ref);
create index if not exists plans_request_idx on lektionskollen.plans (request_id);
drop index if exists lektionskollen.cover_plans_school_idx;   -- the unique constraint already covers it
