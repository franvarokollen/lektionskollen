-- Teacher approval, and an approval that stops being true when the plan changes.
--
-- There was already one approved flag, set by whoever was looking at the plan
-- in the coordinator view. It carries two different claims at once: "I am
-- happy to send this to a substitute" and "someone who knows this subject has
-- read it". A coordinator covering a sick chemistry teacher can honestly make
-- the first claim and not the second, so the pool cannot tell the two apart
-- and a filter on it would be meaningless.
--
-- So approval now records WHAT was claimed:
--   coordinator - signed off for use
--   teacher     - read by someone qualified in the subject
--
-- and WHAT was approved, as a hash of the body. Nothing edits a plan body
-- today, but lk_fill_alt already writes body_alt and extras accumulate, and
-- the first feature that does edit one would otherwise leave every tick in
-- place, silently. A badge that can go stale without saying so is worse than
-- no badge.

alter table lektionskollen.plans
  add column if not exists approved_kind    text,
  add column if not exists approved_subject text,
  add column if not exists approved_sha     text;

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conname = 'plans_approved_kind_ck'
                    and conrelid = 'lektionskollen.plans'::regclass) then
    alter table lektionskollen.plans
      add constraint plans_approved_kind_ck
      check (approved_kind is null or approved_kind in ('coordinator', 'teacher'));
  end if;
end $$;

create or replace function lektionskollen.plan_sha(p_body jsonb)
returns text language sql immutable as $$
  select md5(coalesce(p_body::text, ''));
$$;

-- Everything approved before this migration was a coordinator sign-off, and
-- stamping its current body is the only honest reading: we cannot know whether
-- it changed, and claiming staleness we cannot prove would junk the pool.
update lektionskollen.plans
   set approved_kind = coalesce(approved_kind, 'coordinator'),
       approved_sha  = coalesce(approved_sha, lektionskollen.plan_sha(body))
 where approved;

-- ── Approving ────────────────────────────────────────────
create or replace function public.lk_approve_as(
  p_id uuid, p_kind text default 'coordinator', p_subject text default null)
returns jsonb
language plpgsql security definer set search_path = lektionskollen, pg_temp as $$
declare r lektionskollen.plans;
begin
  if coalesce(p_kind, '') not in ('coordinator', 'teacher') then
    return jsonb_build_object('ok', false, 'error', 'bad_kind');
  end if;

  update lektionskollen.plans
     set approved = true,
         approved_by = auth.uid(),
         approved_at = now(),
         approved_kind = p_kind,
         -- A teacher approval says which subject the approver is qualified in.
         -- Defaulting it to the plan's own subject is the common case and the
         -- one that cannot be wrong: they are approving this plan.
         approved_subject = case when p_kind = 'teacher'
                                 then coalesce(nullif(btrim(p_subject), ''), subject)
                                 else null end,
         approved_sha = lektionskollen.plan_sha(body)
   where id = p_id and school_id = lektionskollen.current_school()
   returning * into r;

  if r.id is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'kind', r.approved_kind,
                            'subject', r.approved_subject, 'at', r.approved_at);
end; $$;

-- The old one-argument call is what the app shipped with; keep it working and
-- let it mean what it always meant.
create or replace function public.lk_approve(p_id uuid)
returns boolean
language sql security definer set search_path = lektionskollen, pg_temp as $$
  select coalesce((public.lk_approve_as(p_id, 'coordinator', null) ->> 'ok')::boolean, false);
$$;

create or replace function public.lk_plan_approval(p_id uuid)
returns jsonb
language sql stable security definer set search_path = lektionskollen, pg_temp as $$
  select jsonb_build_object(
           'approved', p.approved,
           'kind', p.approved_kind,
           'subject', p.approved_subject,
           'at', p.approved_at,
           'stale', p.approved
                    and p.approved_sha is not null
                    and p.approved_sha <> lektionskollen.plan_sha(p.body))
    from lektionskollen.plans p
   where p.id = p_id
     and (p.school_id = lektionskollen.current_school() or p.shared);
$$;

-- ── Reading the pool ─────────────────────────────────────
-- A new name rather than a wider lk_bank_list: changing that function's
-- returned columns means dropping it first, and the ranked wrapper and the app
-- both read it. This adds the approval columns and one filter, and leaves the
-- old readers exactly as they are.
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
           p.approved_kind, p.approved_subject, p.approved_at,
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
       -- 'teacher' means a live teacher approval: one that has gone stale is
       -- not a teacher-approved plan any more, which is the whole point of
       -- tracking the hash.
       and (coalesce(p_approval, 'any') = 'any'
            or (p_approval = 'approved' and p.approved)
            or (p_approval = 'teacher'
                and p.approved and p.approved_kind = 'teacher'
                and (p.approved_sha is null
                     or p.approved_sha = lektionskollen.plan_sha(p.body))))
     group by p.id, s.name
  ), scored as (
    select r.*, public.lk_plan_standing(r.id) as st from rows r
  ), k as (
    select s.*, ((s.st->>'n')::int = 0) as is_new from scored s
  ), proven as (
    select id, row_number() over (order by (st->>'score')::numeric desc nulls last,
                                           created_at desc) as i
      from k where approved and not is_new
  ), fresh as (
    select id, row_number() over (order by created_at desc) as j
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

grant execute on function public.lk_approve_as(uuid, text, text) to anon, authenticated;
grant execute on function public.lk_plan_approval(uuid)          to anon, authenticated;
grant execute on function public.lk_pool(text, text, text, text) to anon, authenticated;

-- The plan view needs the badge without a second round trip. lk_plan already
-- selects an explicit column list into jsonb, so widening it is safe: the
-- return type does not change and nothing has to be dropped.
create or replace function public.lk_plan(p_id uuid)
returns jsonb
language sql stable security definer set search_path = lektionskollen, pg_temp as $$
  select to_jsonb(x) from (
    select p.id, p.title, p.subject, p.year_group, p.minutes, p.language,
           p.body, p.body_alt, p.language_alt,
           p.approved, p.shared, p.share_token, p.model, p.created_at,
           p.approved_kind, p.approved_subject, p.approved_at,
           (p.approved and p.approved_sha is not null
            and p.approved_sha <> lektionskollen.plan_sha(p.body)) as approval_stale
      from lektionskollen.plans p
     where p.id = p_id
       and (p.school_id = lektionskollen.current_school() or p.shared)
  ) x;
$$;
