-- Approval is a ladder, not a tick.
--
--   0  unconfirmed
--   1  coordinator   signed off for use
--   2  teacher       read by a teacher
--   3  qualified     read by a qualified teacher in the subject
--
-- A higher rung replaces a lower one and never the other way round: a
-- coordinator confirming a plan a teacher already confirmed changes nothing.
-- Rung 3 closes the gate - nobody can approve it again - until the plan body
-- changes, at which point the existing body-hash check makes every rung stale
-- and the ladder opens again from the bottom.
--
-- Storage: a qualified teacher is a teacher, so rung 3 is approved_kind
-- 'teacher' plus approved_qualified. That keeps the existing check constraint
-- on approved_kind as it is. Every reader goes through live_rank() and
-- approval_label(), so nothing outside this file needs to know.
--
-- Who signed is recorded. There is no per-person identity here yet (every
-- visitor is the demo school, members is empty), so the name is typed by the
-- approver and is a claim, not proof. approved_by still carries auth.uid() so
-- that when real identities exist the two can be reconciled.
--
-- The rung also feeds the pool ranking, but only as a head start that
-- shrinks as substitutes rate the plan: bonus * 5 / (5 + ratings).
--   qualified +0.10, teacher +0.05, coordinator +0
-- so two ratings leave most of it, twenty leave a fifth, and a plan that
-- substitutes score well will outrank a better-credentialed plan they don't.

alter table lektionskollen.plans
  add column if not exists approved_name      text,
  add column if not exists approved_qualified boolean not null default false;

-- The rung that still holds: an approval of a body that has since changed is
-- worth nothing, whoever gave it.
create or replace function lektionskollen.live_rank(
  p_approved boolean, p_kind text, p_qualified boolean, p_sha text, p_body jsonb)
returns int language sql stable as $$
  select case
    when not coalesce(p_approved, false) then 0
    when p_sha is not null and p_sha <> lektionskollen.plan_sha(p_body) then 0
    when p_kind = 'coordinator' then 1
    when p_kind = 'teacher' then case when coalesce(p_qualified, false) then 3 else 2 end
    else 0 end;
$$;

-- What the app is told the approval is: 'qualified' rather than a teacher flag.
create or replace function lektionskollen.approval_label(p_kind text, p_qualified boolean)
returns text language sql immutable as $$
  select case when p_kind = 'teacher' and coalesce(p_qualified, false)
              then 'qualified' else p_kind end;
$$;

-- ── Approving ────────────────────────────────────────────
-- The three-argument form cannot carry a name. It is replaced in place so an
-- old client cannot make a nameless approval, and the new four-argument form
-- has no defaults so a three-argument call can only ever match the old one.
create or replace function public.lk_approve_as(
  p_id uuid, p_kind text default 'coordinator', p_subject text default null)
returns jsonb
language sql stable security definer set search_path = lektionskollen, pg_temp as $$
  select jsonb_build_object('ok', false, 'error', 'name_required');
$$;

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

create or replace function public.lk_plan_approval(p_id uuid)
returns jsonb
language sql stable security definer set search_path = lektionskollen, pg_temp as $$
  select jsonb_build_object(
           'approved', p.approved,
           'kind', lektionskollen.approval_label(p.approved_kind, p.approved_qualified),
           'rank', lektionskollen.live_rank(p.approved, p.approved_kind,
                                            p.approved_qualified, p.approved_sha, p.body),
           'name', p.approved_name,
           'subject', p.approved_subject,
           'at', p.approved_at,
           'stale', p.approved
                    and p.approved_sha is not null
                    and p.approved_sha <> lektionskollen.plan_sha(p.body))
    from lektionskollen.plans p
   where p.id = p_id
     and (p.school_id = lektionskollen.current_school() or p.shared);
$$;

create or replace function public.lk_plan(p_id uuid)
returns jsonb
language sql stable security definer set search_path = lektionskollen, pg_temp as $$
  select to_jsonb(x) from (
    select p.id, p.title, p.subject, p.year_group, p.minutes, p.language,
           p.body, p.body_alt, p.language_alt,
           p.approved, p.shared, p.share_token, p.model, p.created_at,
           lektionskollen.approval_label(p.approved_kind, p.approved_qualified) as approved_kind,
           p.approved_subject, p.approved_at, p.approved_name,
           lektionskollen.live_rank(p.approved, p.approved_kind, p.approved_qualified,
                                    p.approved_sha, p.body) as approval_rank,
           (p.approved and p.approved_sha is not null
            and p.approved_sha <> lektionskollen.plan_sha(p.body)) as approval_stale,
           p.check_result, p.checked_at
      from lektionskollen.plans p
     where p.id = p_id
       and (p.school_id = lektionskollen.current_school() or p.shared)
  ) x;
$$;

-- ── The pool ─────────────────────────────────────────────
-- The 'teacher' filter now means teacher OR ABOVE, since a qualified plan has
-- been read by a teacher too, and 'qualified' is new.
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

grant execute on function public.lk_approve_as(uuid, text, text)       to anon, authenticated;
grant execute on function public.lk_approve_as(uuid, text, text, text) to anon, authenticated;
grant execute on function public.lk_plan_approval(uuid)                 to anon, authenticated;
grant execute on function public.lk_pool(text, text, text, text)       to anon, authenticated;
