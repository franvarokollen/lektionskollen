-- Live assist: what a substitute pulls out of the plan mid-lesson, and the
-- rating change that goes with it.
--
-- Applied to pbamabzbfbkxajntsrmc in five migrations; kept here so the schema
-- is reproducible and reviewable rather than existing only in the dashboard.

-- ── Extras ────────────────────────────────────────────────────
create table if not exists lektionskollen.plan_extras (
  id              bigserial primary key,
  plan_id         uuid not null references lektionskollen.plans(id) on delete cascade,
  -- 'phase:2', 'task:3', or 'lesson' for whole-lesson asks. This is what
  -- turns button presses into per-section signal.
  section_ref     text not null default 'lesson',
  section_label   text,
  kind            text not null check (kind in ('explain','exercise','level','filler')),
  variant         text,
  language        text not null default 'sv',
  body            jsonb not null,
  created_by_kind text not null check (created_by_kind in ('vikarie','coordinator')),
  created_by      uuid,
  reviewed        boolean not null default false,
  reviewed_by     uuid,
  reviewed_at     timestamptz,
  kept            boolean,
  model           text,
  created_at      timestamptz not null default now()
);

create index if not exists plan_extras_plan_idx   on lektionskollen.plan_extras (plan_id, created_at desc);
create index if not exists plan_extras_heat_idx   on lektionskollen.plan_extras (plan_id, section_ref, kind);
create index if not exists plan_extras_review_idx on lektionskollen.plan_extras (reviewed, created_at desc);

alter table lektionskollen.plan_extras enable row level security;

-- ── Binary rating ─────────────────────────────────────────────
-- One tap is a complete answer. Stars cluster at 4-5 and carry almost no
-- information; "would you use this again" is what the bank needs to know.
alter table lektionskollen.ratings add column if not exists would_reuse boolean;
alter table lektionskollen.ratings add column if not exists reasons text[] not null default '{}';
update lektionskollen.ratings set would_reuse = (score >= 4) where would_reuse is null;

create or replace function lektionskollen.apply_threshold()
returns trigger language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
begin
  update lektionskollen.plans p
     set shared = (stats.n >= 3 and stats.yes::numeric / stats.n >= 2.0/3.0)
    from (select count(*) as n, count(*) filter (where would_reuse) as yes
            from lektionskollen.ratings
           where plan_id = new.plan_id and would_reuse is not null) stats
   where p.id = new.plan_id and p.approved;
  return new;
end; $$;

-- ── Demotion on repeated assists ──────────────────────────────
-- The honest signal. If three lessons needed the same part re-explained,
-- that part is weak however the plan was rated.
create or replace function lektionskollen.demote_on_repeat_assist()
returns trigger language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare hits int;
begin
  if new.created_by_kind <> 'vikarie' or new.kind <> 'explain' then return new; end if;
  select count(*) into hits from lektionskollen.plan_extras
   where plan_id = new.plan_id and section_ref = new.section_ref
     and kind = 'explain' and created_by_kind = 'vikarie';
  if hits >= 3 then
    update lektionskollen.plans set shared = false where id = new.plan_id;
  end if;
  return new;
end; $$;

drop trigger if exists demote_on_repeat_assist on lektionskollen.plan_extras;
create trigger demote_on_repeat_assist
after insert on lektionskollen.plan_extras
for each row execute function lektionskollen.demote_on_repeat_assist();

-- ── Quota ─────────────────────────────────────────────────────
-- The page this is called from has no login, so the limit is server-side.
create or replace function lektionskollen.assist_quota_left(p_plan uuid)
returns integer language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select 20 - (select count(*)::int from lektionskollen.plan_extras
                where plan_id = p_plan and created_by_kind = 'vikarie'
                  and created_at > now() - interval '1 day');
$$;

create or replace function public.lk_assist_quota(p_token text)
returns integer language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce((select lektionskollen.assist_quota_left(p.id)
                     from lektionskollen.plans p
                    where p.share_token = p_token and p.approved), 0);
$$;

-- ── RPC surface ───────────────────────────────────────────────
create or replace function public.lk_assist_save(
  p_token text, p_section_ref text, p_section_label text, p_kind text,
  p_variant text, p_language text, p_body jsonb, p_model text default null
) returns jsonb language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare pid uuid; left_today int; row_id bigint;
begin
  select id into pid from lektionskollen.plans where share_token = p_token and approved;
  if pid is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;

  left_today := lektionskollen.assist_quota_left(pid);
  if left_today <= 0 then return jsonb_build_object('ok', false, 'error', 'quota'); end if;

  insert into lektionskollen.plan_extras
    (plan_id, section_ref, section_label, kind, variant, language, body, created_by_kind, model)
  values
    (pid, coalesce(nullif(p_section_ref,''),'lesson'), nullif(p_section_label,''),
     p_kind, nullif(p_variant,''), coalesce(nullif(p_language,''),'sv'),
     p_body, 'vikarie', nullif(p_model,''))
  returning id into row_id;

  return jsonb_build_object('ok', true, 'id', row_id, 'quota_left', left_today - 1);
end; $$;

create or replace function public.lk_extras_by_token(p_token text)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb)
    from (select e.id, e.section_ref, e.section_label, e.kind, e.variant,
                 e.language, e.body, e.reviewed, e.kept, e.created_at
            from lektionskollen.plan_extras e
            join lektionskollen.plans p on p.id = e.plan_id
           where p.share_token = p_token and p.approved) x;
$$;

create or replace function public.lk_rate_by_token_v2(
  p_token text, p_reuse boolean, p_reasons text[] default '{}'
) returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare pid uuid;
begin
  select id into pid from lektionskollen.plans where share_token = p_token and approved;
  if pid is null then return false; end if;
  insert into lektionskollen.ratings (plan_id, rater_kind, score, would_reuse, reasons)
  values (pid, 'vikarie', case when p_reuse then 5 else 2 end, p_reuse, coalesce(p_reasons, '{}'));
  return true;
end; $$;

-- Reason chips refine the verdict already cast. Without this they would
-- insert a fresh rating per tap and quietly stuff the ballot.
create or replace function public.lk_rate_reasons_by_token(p_token text, p_reasons text[])
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare rid bigint;
begin
  select r.id into rid from lektionskollen.ratings r
    join lektionskollen.plans p on p.id = r.plan_id
   where p.share_token = p_token and r.rater_kind = 'vikarie'
   order by r.created_at desc limit 1;
  if rid is null then return false; end if;
  update lektionskollen.ratings set reasons = coalesce(p_reasons, '{}') where id = rid;
  return true;
end; $$;

create or replace function public.lk_rate_v2(
  p_id uuid, p_reuse boolean, p_reasons text[] default '{}'
) returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
begin
  insert into lektionskollen.ratings (plan_id, rater_kind, user_id, score, would_reuse, reasons)
  values (p_id, 'coordinator', auth.uid(), case when p_reuse then 5 else 2 end,
          p_reuse, coalesce(p_reasons, '{}'));
  return true;
end; $$;

-- Coordinator side: review queue and section heat map.
create or replace function public.lk_extras(p_id uuid)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
    from (select e.id, e.plan_id, e.section_ref, e.section_label, e.kind, e.variant,
                 e.language, e.body, e.reviewed, e.kept, e.created_by_kind, e.created_at,
                 p.title, p.subject, p.year_group
            from lektionskollen.plan_extras e
            join lektionskollen.plans p on p.id = e.plan_id
           where (p_id is null or e.plan_id = p_id)
             and p.school_id in (select school_id from lektionskollen.members where user_id = auth.uid()
                                 union all select lektionskollen.demo_school())) x;
$$;

create or replace function public.lk_review_extra(p_extra_id bigint, p_kept boolean)
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
begin
  update lektionskollen.plan_extras
     set reviewed = true, kept = p_kept, reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_extra_id;
  return found;
end; $$;

create or replace function public.lk_plan_heat(p_id uuid)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.n desc), '[]'::jsonb)
    from (select section_ref, section_label, kind, count(*)::int as n
            from lektionskollen.plan_extras
           where plan_id = p_id and created_by_kind = 'vikarie'
           group by 1,2,3) x;
$$;

grant execute on function public.lk_assist_save(text,text,text,text,text,text,jsonb,text) to anon, authenticated, service_role;
grant execute on function public.lk_assist_quota(text)                                   to anon, authenticated, service_role;
grant execute on function public.lk_extras_by_token(text)                                to anon, authenticated, service_role;
grant execute on function public.lk_rate_by_token_v2(text,boolean,text[])                to anon, authenticated, service_role;
grant execute on function public.lk_rate_reasons_by_token(text,text[])                   to anon, authenticated, service_role;
grant execute on function public.lk_rate_v2(uuid,boolean,text[])                         to anon, authenticated, service_role;
grant execute on function public.lk_extras(uuid)                                         to anon, authenticated, service_role;
grant execute on function public.lk_review_extra(bigint,boolean)                         to anon, authenticated, service_role;
grant execute on function public.lk_plan_heat(uuid)                                      to anon, authenticated, service_role;
