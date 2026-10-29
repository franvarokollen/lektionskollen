-- Plans the school already has, and lessons that need none.
--
-- Most cover lessons are not waiting for a generated plan. A teacher emails
-- "they're on chapter 4, exercises 1-8" when they call in sick; another keeps
-- the week in a shared document; a third lesson is a test and needs nothing at
-- all. Until now the add-on could only see its own plans, so every one of those
-- looked identical to "nobody has done anything", and any count built on that
-- would nag forever and be learned to ignore.
--
-- One row per cover slot answers the only question that matters: does the
-- substitute have something to teach from?
--
--   generated   a Lektionskollen plan (the plan row itself holds the content)
--   linked      the teacher's own, somewhere else, reached by URL
--   note        the teacher's own, short enough to be typed here
--   authored    written in Frånvarokollen itself — not built yet, but the
--               value exists so adding it later moves no data
--   not_needed  decided, deliberately, that this lesson needs no plan
--
-- not_needed is what makes the other states worth counting: without it a
-- coordinator can never clear the list, so the list stops meaning anything.

create table if not exists lektionskollen.cover_plans (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references lektionskollen.schools(id) on delete cascade,
  absence_ref text not null,
  kind        text not null check (kind in ('linked', 'note', 'authored', 'not_needed')),
  url         text,
  note        text,
  label       text,
  -- The substitute's door, same shape as a generated plan's: no login, no
  -- account, a link that works on a phone in a corridor.
  share_token text unique not null default encode(gen_random_bytes(9), 'hex'),
  set_by      uuid default auth.uid(),
  set_at      timestamptz not null default now(),
  unique (school_id, absence_ref)
);

create index if not exists cover_plans_school_idx on lektionskollen.cover_plans (school_id, absence_ref);

alter table lektionskollen.cover_plans enable row level security;

-- Set or change what a cover slot has. One row per slot, so choosing again
-- replaces the last answer rather than stacking up decisions.
create or replace function public.lk_set_cover_plan(
  p_absence_ref text, p_kind text, p_url text default null,
  p_note text default null, p_label text default null)
returns jsonb language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare sid uuid; row lektionskollen.cover_plans;
begin
  sid := lektionskollen.current_school();
  if sid is null then return 'null'::jsonb; end if;
  if p_kind not in ('linked', 'note', 'authored', 'not_needed') then
    raise exception 'unknown kind %', p_kind;
  end if;
  insert into lektionskollen.cover_plans (school_id, absence_ref, kind, url, note, label)
  values (sid, p_absence_ref, p_kind, nullif(btrim(p_url), ''), nullif(btrim(p_note), ''), nullif(btrim(p_label), ''))
  on conflict (school_id, absence_ref) do update
    set kind = excluded.kind, url = excluded.url, note = excluded.note,
        label = excluded.label, set_by = auth.uid(), set_at = now()
  returning * into row;
  return to_jsonb(row);
end; $$;

create or replace function public.lk_clear_cover_plan(p_absence_ref text)
returns boolean language sql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  with d as (
    delete from lektionskollen.cover_plans
     where school_id = lektionskollen.current_school() and absence_ref = p_absence_ref
    returning 1)
  select exists (select 1 from d);
$$;

-- What every cover slot this school can see has: one call for the whole grid,
-- so a day of lessons paints without a request per block.
create or replace function public.lk_cover_plans()
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(jsonb_object_agg(x.absence_ref, x.state), '{}'::jsonb) from (
    -- A generated plan wins: it is the richer thing, and the coordinator made it.
    select r.absence_ref,
           jsonb_build_object('kind', 'generated', 'plan_id', p.id, 'title', p.title,
                              'approved', p.approved, 'share_token', p.share_token) as state
      from lektionskollen.plans p
      join lektionskollen.requests r on r.id = p.request_id
     where r.absence_ref is not null
       and p.school_id in (select school_id from lektionskollen.members where user_id = auth.uid()
                           union all select lektionskollen.demo_school())
    union all
    select c.absence_ref,
           jsonb_build_object('kind', c.kind, 'url', c.url, 'note', c.note,
                              'label', c.label, 'share_token', c.share_token)
      from lektionskollen.cover_plans c
     where c.school_id in (select school_id from lektionskollen.members where user_id = auth.uid()
                           union all select lektionskollen.demo_school())
       and not exists (
         select 1 from lektionskollen.plans p
           join lektionskollen.requests r on r.id = p.request_id
          where r.absence_ref = c.absence_ref and p.school_id = c.school_id)
  ) x;
$$;

-- The substitute's view of a linked plan. Deliberately thin: a link, a note,
-- and who it came from. There is nothing to rate and nothing to bank here —
-- it is somebody else's work, and a visible score on a named colleague's
-- lesson is a quarrel, not a signal. The coverage question still applies,
-- because "how far did you get" is for the class teacher, not a verdict.
create or replace function public.lk_linked_by_token(p_token text)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(to_jsonb(x), 'null'::jsonb) from (
    select c.absence_ref, c.kind, c.url, c.note, c.label, c.share_token, c.set_at,
           s.name as school
      from lektionskollen.cover_plans c
      join lektionskollen.schools s on s.id = c.school_id
     where c.share_token = p_token and c.kind <> 'not_needed') x;
$$;

-- Coverage and the handover note, against a linked plan rather than a plan row.
create table if not exists lektionskollen.linked_feedback (
  id          uuid primary key default gen_random_uuid(),
  cover_plan  uuid not null references lektionskollen.cover_plans(id) on delete cascade,
  coverage    text check (coverage in ('all', 'part', 'none')),
  left_off    text,
  created_at  timestamptz not null default now()
);

create unique index if not exists linked_feedback_one on lektionskollen.linked_feedback (cover_plan);
alter table lektionskollen.linked_feedback enable row level security;

create or replace function public.lk_linked_coverage(
  p_token text, p_coverage text default null, p_left_off text default null)
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare cid uuid;
begin
  select id into cid from lektionskollen.cover_plans where share_token = p_token;
  if cid is null then return false; end if;
  insert into lektionskollen.linked_feedback (cover_plan, coverage, left_off)
  values (cid, p_coverage, nullif(btrim(p_left_off), ''))
  on conflict (cover_plan) do update
    set coverage = coalesce(excluded.coverage, lektionskollen.linked_feedback.coverage),
        left_off = coalesce(excluded.left_off, lektionskollen.linked_feedback.left_off);
  return true;
end; $$;

grant execute on function public.lk_set_cover_plan(text,text,text,text,text) to anon, authenticated, service_role;
grant execute on function public.lk_clear_cover_plan(text)                   to anon, authenticated, service_role;
grant execute on function public.lk_cover_plans()                            to anon, authenticated, service_role;
grant execute on function public.lk_linked_by_token(text)                    to anon, authenticated, service_role;
grant execute on function public.lk_linked_coverage(text,text,text)          to anon, authenticated, service_role;
