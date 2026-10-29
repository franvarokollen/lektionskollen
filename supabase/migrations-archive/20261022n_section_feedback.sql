-- Per-section feedback from the substitute: one tap per step of the lesson
-- (worked / needed changes / skipped) and an optional one-line note.
--
-- The help buttons only tell us where a substitute asked for help, which is an
-- indirect signal. This is the direct one, and it is what lets a coordinator
-- see that step 3 is the one that needs rewriting.

create table if not exists lektionskollen.section_feedback (
  plan_id       uuid not null references lektionskollen.plans(id) on delete cascade,
  rater_session text not null,
  section_ref   text not null,
  section_label text,
  verdict       text not null check (verdict in ('worked', 'changes', 'skipped')),
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (plan_id, rater_session, section_ref)
);
-- No policies: nothing reads or writes this except the functions below.
alter table lektionskollen.section_feedback enable row level security;

create or replace function public.lk_rate_section_by_token(
  p_token text, p_session text, p_ref text, p_label text,
  p_verdict text default null, p_note text default null)
returns boolean language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare pid uuid; v text := nullif(btrim(p_verdict), ''); n text := nullif(btrim(p_note), '');
begin
  select id into pid from lektionskollen.plans where share_token = p_token and approved;
  if pid is null or coalesce(btrim(p_session), '') = '' or coalesce(btrim(p_ref), '') = '' then return false; end if;
  if v is not null and v not in ('worked', 'changes', 'skipped') then return false; end if;
  if v is null and n is null then return false; end if;

  insert into lektionskollen.section_feedback (plan_id, rater_session, section_ref, section_label, verdict, note)
  values (pid, left(p_session, 80), left(p_ref, 40), left(p_label, 120), coalesce(v, 'changes'), left(n, 400))
  on conflict (plan_id, rater_session, section_ref) do update
    set verdict = coalesce(v, lektionskollen.section_feedback.verdict),
        note    = coalesce(left(n, 400), lektionskollen.section_feedback.note),
        section_label = coalesce(left(p_label, 120), lektionskollen.section_feedback.section_label),
        updated_at = now();
  return true;
end; $$;

-- What each step got, for a coordinator. Counts per verdict plus the notes.
create or replace function public.lk_section_feedback(p_id uuid)
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(jsonb_agg(to_jsonb(s) order by s.section_ref), '[]'::jsonb)
    from (
      select f.section_ref,
             max(f.section_label) as section_label,
             count(*) filter (where f.verdict = 'worked')::int  as worked,
             count(*) filter (where f.verdict = 'changes')::int as changes,
             count(*) filter (where f.verdict = 'skipped')::int as skipped,
             coalesce(jsonb_agg(f.note order by f.updated_at desc) filter (where f.note is not null), '[]'::jsonb) as notes
        from lektionskollen.section_feedback f
       where f.plan_id = p_id
       group by f.section_ref) s;
$$;

create or replace function public.lk_feedback_overview()
returns jsonb language sql stable security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.last_at desc), '[]'::jsonb)
    from (
      select p.id, p.title, p.subject, p.year_group,
             (select count(*)::int from lektionskollen.ratings r
               where r.plan_id = p.id and r.rater_kind = 'vikarie' and r.would_reuse is not null) as ratings,
             (select count(*)::int from lektionskollen.ratings r
               where r.plan_id = p.id and r.rater_kind = 'vikarie' and r.would_reuse) as yes,
             coalesce((select jsonb_agg(jsonb_build_object(
                         'section_ref', h.section_ref, 'section_label', h.section_label,
                         'kind', h.kind, 'n', h.n) order by h.n desc)
                from (select section_ref, section_label, kind, count(*)::int as n
                        from lektionskollen.plan_extras
                       where plan_id = p.id and created_by_kind = 'vikarie'
                       group by 1,2,3) h), '[]'::jsonb) as heat,
             public.lk_section_feedback(p.id) as sections,
             public.lk_plan_feedback(p.id) as feedback,
             greatest(
               (select max(created_at) from lektionskollen.ratings where plan_id = p.id and rater_kind = 'vikarie'),
               (select max(created_at) from lektionskollen.plan_extras where plan_id = p.id and created_by_kind = 'vikarie'),
               (select max(updated_at) from lektionskollen.section_feedback where plan_id = p.id)
             ) as last_at
        from lektionskollen.plans p
       where p.school_id in (select school_id from lektionskollen.members where user_id = auth.uid()
                             union all select lektionskollen.demo_school())
         and (exists (select 1 from lektionskollen.ratings r where r.plan_id = p.id and r.rater_kind = 'vikarie')
              or exists (select 1 from lektionskollen.plan_extras e where e.plan_id = p.id and e.created_by_kind = 'vikarie')
              or exists (select 1 from lektionskollen.section_feedback f where f.plan_id = p.id))
    ) x;
$$;

grant execute on function public.lk_rate_section_by_token(text,text,text,text,text,text) to anon, authenticated, service_role;
grant execute on function public.lk_section_feedback(uuid) to authenticated, service_role;
grant execute on function public.lk_feedback_overview() to anon, authenticated, service_role;
