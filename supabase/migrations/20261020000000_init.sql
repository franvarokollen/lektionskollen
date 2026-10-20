-- Lektionskollen – initial schema
-- Designed to sit alongside Frånvarokollen: absences live in FVK, we only keep a reference.

create extension if not exists pgcrypto;

-- ── Schools & membership ───────────────────────────────────
create table public.schools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  fvk_ref     text unique,                 -- school id in Frånvarokollen
  created_at  timestamptz not null default now()
);

create table public.school_members (
  school_id   uuid not null references public.schools(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'coordinator' check (role in ('coordinator','teacher','admin')),
  created_at  timestamptz not null default now(),
  primary key (school_id, user_id)
);

create or replace function public.is_member(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.school_members m where m.school_id = sid and m.user_id = auth.uid());
$$;

-- ── Requests (one per "Lektionsplan behövs" click) ─────────
create table public.lesson_requests (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools(id) on delete cascade,
  absence_ref      text,                   -- FVK absence/cover id
  requested_by     uuid default auth.uid() references auth.users(id),
  subject          text not null,
  year_group       text not null,
  duration_minutes int  not null check (duration_minutes between 10 and 240),
  topic            text,
  teacher_notes    text,
  resources        text[] not null default '{}',
  language         text not null default 'sv',
  status           text not null default 'requested'
                   check (status in ('requested','generating','ready','sent','failed')),
  created_at       timestamptz not null default now()
);
create index on public.lesson_requests (school_id, created_at desc);
create index on public.lesson_requests (absence_ref);

-- ── Plans (generated output, versioned on edit) ────────────
create table public.lesson_plans (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid references public.lesson_requests(id) on delete set null,
  school_id      uuid not null references public.schools(id) on delete cascade,
  subject        text not null,
  year_group     text not null,
  title          text,
  language       text not null default 'sv',
  plan           jsonb not null,
  model          text,
  version        int  not null default 1,
  share_token    text unique default encode(gen_random_bytes(12), 'hex'),  -- vikarie read-only link (phase 2)
  created_by     uuid default auth.uid() references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.lesson_plans (school_id, subject, year_group);

-- ── Usage metering ─────────────────────────────────────────
create table public.usage_events (
  id                 bigserial primary key,
  school_id          uuid references public.schools(id) on delete set null,
  user_id            uuid default auth.uid(),
  absence_ref        text,
  model              text,
  prompt_tokens      int,
  completion_tokens  int,
  duration_ms        int,
  created_at         timestamptz not null default now()
);

-- ── RLS ────────────────────────────────────────────────────
alter table public.schools         enable row level security;
alter table public.school_members  enable row level security;
alter table public.lesson_requests enable row level security;
alter table public.lesson_plans    enable row level security;
alter table public.usage_events    enable row level security;

create policy "members read school"   on public.schools        for select using (public.is_member(id));
create policy "members read members"  on public.school_members for select using (public.is_member(school_id));

create policy "members read requests"   on public.lesson_requests for select using (public.is_member(school_id));
create policy "members create requests" on public.lesson_requests for insert with check (public.is_member(school_id));
create policy "members update requests" on public.lesson_requests for update using (public.is_member(school_id));

create policy "members read plans"   on public.lesson_plans for select using (public.is_member(school_id));
create policy "members create plans" on public.lesson_plans for insert with check (public.is_member(school_id));
create policy "members update plans" on public.lesson_plans for update using (public.is_member(school_id));

create policy "users log own usage"  on public.usage_events for insert with check (user_id = auth.uid());
create policy "members read usage"   on public.usage_events for select using (school_id is not null and public.is_member(school_id));
