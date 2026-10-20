-- Cost controls: cached extras, configurable assist cap, model flag exposed so the UI can say "simulated".

-- ── 1. Extras cache ───────────────────────────────────────────
-- Same section + kind + variant + language (+ subject/year) gets the stored answer
-- instead of another model call. Only the edge function (service role) may use it.
create table if not exists lektionskollen.assist_cache (
  cache_key  text primary key,
  pair       jsonb not null,
  model      text,
  hits       int not null default 0,
  created_at timestamptz not null default now(),
  last_hit   timestamptz
);

create or replace function public.lk_cache_get(p_key text)
returns jsonb language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare r lektionskollen.assist_cache;
begin
  if coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') <> 'service_role' then
    raise exception 'not allowed';
  end if;
  update lektionskollen.assist_cache
     set hits = hits + 1, last_hit = now()
   where cache_key = p_key and created_at > now() - interval '180 days'
  returning * into r;
  if r.cache_key is null then return null; end if;
  return jsonb_build_object('pair', r.pair, 'model', r.model);
end; $$;

create or replace function public.lk_cache_put(p_key text, p_pair jsonb, p_model text)
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
begin
  if coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') <> 'service_role' then
    raise exception 'not allowed';
  end if;
  insert into lektionskollen.assist_cache (cache_key, pair, model)
  values (p_key, p_pair, p_model)
  on conflict (cache_key) do update set pair = excluded.pair, model = excluded.model, created_at = now();
  return true;
end; $$;

grant execute on function public.lk_cache_get(text)            to service_role;
grant execute on function public.lk_cache_put(text,jsonb,text) to service_role;

-- ── 2. Assist cap as a setting (5 / 20 / unlimited = -1) ──────
create table if not exists lektionskollen.school_settings (
  school_id  uuid primary key,
  assist_cap int not null default 20 check (assist_cap = -1 or assist_cap between 1 and 1000),
  updated_at timestamptz not null default now()
);

create or replace function lektionskollen.assist_quota_left(p_plan uuid)
returns integer language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select case when x.cap = -1 then 999999 else x.cap - x.used end
    from (select coalesce((select s.assist_cap from lektionskollen.school_settings s
                             join lektionskollen.plans p on p.school_id = s.school_id
                            where p.id = p_plan), 20) as cap,
                 (select count(*)::int from lektionskollen.plan_extras
                   where plan_id = p_plan and created_by_kind = 'vikarie'
                     and created_at > now() - interval '1 day') as used) x;
$$;

create or replace function public.lk_get_settings()
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select jsonb_build_object('assist_cap', coalesce(
    (select assist_cap from lektionskollen.school_settings where school_id = lektionskollen.current_school()), 20));
$$;

create or replace function public.lk_set_assist_cap(p_cap int)
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
begin
  if p_cap <> -1 and (p_cap < 1 or p_cap > 1000) then return false; end if;
  insert into lektionskollen.school_settings (school_id, assist_cap)
  values (lektionskollen.current_school(), p_cap)
  on conflict (school_id) do update set assist_cap = excluded.assist_cap, updated_at = now();
  return true;
end; $$;

grant execute on function public.lk_get_settings()        to anon, authenticated, service_role;
grant execute on function public.lk_set_assist_cap(int)   to anon, authenticated, service_role;

-- ── 3. Expose which model produced what (so the UI can flag simulated) ──
create or replace function public.lk_plan_by_token(p_token text)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select to_jsonb(x) from (
    select p.id, p.title, p.subject, p.year_group, p.minutes, p.language,
           p.body, p.body_alt, p.language_alt, p.model, s.name as school
      from lektionskollen.plans p join lektionskollen.schools s on s.id = p.school_id
     where p.share_token = p_token and p.approved
  ) x;
$$;

create or replace function public.lk_extras_by_token(p_token text)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]'::jsonb)
    from (select e.id, e.section_ref, e.section_label, e.kind, e.variant,
                 e.language, e.body, e.body_alt, e.language_alt, e.model,
                 e.reviewed, e.kept, e.created_at
            from lektionskollen.plan_extras e
            join lektionskollen.plans p on p.id = e.plan_id
           where p.share_token = p_token and p.approved) x;
$$;

create or replace function public.lk_extras(p_id uuid)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb)
    from (select e.id, e.plan_id, e.section_ref, e.section_label, e.kind, e.variant,
                 e.language, e.body, e.body_alt, e.language_alt, e.model,
                 e.reviewed, e.kept, e.created_by_kind, e.created_at,
                 p.title, p.subject, p.year_group
            from lektionskollen.plan_extras e
            join lektionskollen.plans p on p.id = e.plan_id
           where (p_id is null or e.plan_id = p_id)
             and p.school_id in (select school_id from lektionskollen.members where user_id = auth.uid()
                                 union all select lektionskollen.demo_school())) x;
$$;
