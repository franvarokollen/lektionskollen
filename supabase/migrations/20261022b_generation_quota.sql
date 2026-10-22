-- A daily ceiling on plans, so a month of testing cannot turn into a bill.
--
-- Baz: "I just don't want it to spiral out of control... so a daily limit of
-- plans that can be generated seems a reasonable step — so we don't count
-- words we count plans, and within that users can generate content to support
-- that plan too."
--
-- Plans are the meter because a plan is the thing a school asks for and the
-- thing it would recognise on an invoice. Tokens are what we pay in, but nobody
-- plans their day in tokens.
--
-- Extras are NOT counted here. They already had a cap — assist_quota_left,
-- reading school_settings.assist_cap and counting what a substitute actually
-- created in the last day — and a second mechanism with a different number
-- beside the first is how they drift apart and how one of them quietly stops
-- being the one that matters.

create table if not exists lektionskollen.usage_day (
  school_id uuid not null references lektionskollen.schools(id) on delete cascade,
  on_day    date not null default current_date,
  kind      text not null check (kind in ('plan', 'assist')),
  ref       uuid not null default '00000000-0000-0000-0000-000000000000',
  n         int  not null default 0,
  primary key (school_id, on_day, kind, ref)
);
alter table lektionskollen.usage_day enable row level security;

-- Limits live per school so one can be raised without a deploy, and default for
-- any school that has never been given one.
create table if not exists lektionskollen.quota (
  school_id        uuid primary key references lektionskollen.schools(id) on delete cascade,
  plans_per_day    int not null default 20,
  assists_per_plan int not null default 10,   -- unused; see assist_quota_left
  note             text
);
alter table lektionskollen.quota enable row level security;

create or replace function public.lk_quota_limits()
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select jsonb_build_object(
    'plans_per_day',    coalesce(q.plans_per_day, 20),
    'assists_per_plan', coalesce(q.assists_per_plan, 10))
    from (select lektionskollen.current_school() s) c
    left join lektionskollen.quota q on q.school_id = c.s;
$$;

-- What is left today, without spending anything. The app reads this so a
-- coordinator can see the ceiling before they hit it rather than after.
create or replace function public.lk_quota_state()
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select jsonb_build_object(
    'plans_used',  coalesce((select n from lektionskollen.usage_day
                              where school_id = lektionskollen.current_school()
                                and on_day = current_date and kind = 'plan'), 0),
    'plans_limit', (public.lk_quota_limits() ->> 'plans_per_day')::int,
    'resets_at',   (current_date + 1)::timestamptz);
$$;

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
  -- Extras are capped by assist_quota_left, not here.
  if p_kind <> 'plan' then
    return jsonb_build_object('ok', false, 'reason', 'bad_kind');
  end if;

  lim := (public.lk_quota_limits() ->> 'plans_per_day')::int;

  -- The check and the increment are one statement, so two coordinators pressing
  -- the button together cannot both be told yes on the last remaining plan.
  insert into lektionskollen.usage_day (school_id, on_day, kind, ref, n)
  values (sid, current_date, 'plan', '00000000-0000-0000-0000-000000000000'::uuid, 1)
  on conflict (school_id, on_day, kind, ref) do update
     set n = lektionskollen.usage_day.n + 1
   where lektionskollen.usage_day.n < lim
  returning n into got;

  if got is null then
    return jsonb_build_object(
      'ok', false, 'reason', 'limit', 'kind', 'plan',
      'limit', lim, 'resets_at', (current_date + 1)::timestamptz);
  end if;
  return jsonb_build_object('ok', true, 'used', got, 'limit', lim);
end; $$;

-- Give a unit back when the work failed, so a model timeout does not cost a
-- school one of its plans for the day.
create or replace function public.lk_quota_give_back(p_kind text, p_ref uuid default null)
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
begin
  update lektionskollen.usage_day
     set n = greatest(0, n - 1)
   where school_id = lektionskollen.current_school()
     and on_day = current_date and kind = p_kind
     and ref = '00000000-0000-0000-0000-000000000000'::uuid;
  return found;
end; $$;

-- The existing cap on extras, reachable by plan id so the edge function can
-- enforce it rather than trusting the page to have asked. plan.html already
-- checks by share token before calling; this closes the same door from inside.
create or replace function public.lk_assist_quota_by_plan(p_plan uuid)
returns integer language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(lektionskollen.assist_quota_left(p_plan), 0);
$$;

grant execute on function public.lk_quota_limits()              to anon, authenticated, service_role;
grant execute on function public.lk_quota_state()               to anon, authenticated, service_role;
grant execute on function public.lk_quota_take(text, uuid)      to anon, authenticated, service_role;
grant execute on function public.lk_quota_give_back(text, uuid) to anon, authenticated, service_role;
grant execute on function public.lk_assist_quota_by_plan(uuid)  to anon, authenticated, service_role;
