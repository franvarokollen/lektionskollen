-- Plans a person makes themselves: written from scratch, uploaded, or written
-- by the AI at their request — not for a particular absence.
--
-- Needs 20261028a (origin, share_allowed, author_name).
--
-- Saving and approving stay two steps on purpose. Approval goes through
-- lk_approve_as exactly as it does for every other plan, so a self-approved
-- plan meets the same check (no blockers) and carries the same label (rung,
-- name, subject). A qualified teacher approving their own plan is simply the
-- top rung; nothing is waved through.

create or replace function public.lk_save_own_plan(
  p_request jsonb, p_plan jsonb,
  p_origin text default 'teacher', p_author text default null,
  p_share boolean default false, p_model text default null)
returns uuid language plpgsql security definer
set search_path to 'lektionskollen', 'pg_temp' as $$
declare pid uuid; who text := nullif(btrim(coalesce(p_author, '')), '');
begin
  if p_origin not in ('ai', 'teacher') then raise exception 'bad origin'; end if;
  if who is not null and char_length(who) > 80 then raise exception 'name too long'; end if;

  -- Same request + plan rows as every other plan; no absence attached.
  -- Named arguments: there were two overloads, and three positional ones were
  -- ambiguous between them. 20261028d drops the old one.
  pid := public.lk_save_plan(p_request => p_request - 'absence_ref', p_plan => p_plan,
                             p_model => p_model, p_plan_alt => null, p_language_alt => null);

  update lektionskollen.plans
     set origin = p_origin,
         author_name = who,
         -- A teacher's own plan never leaves the school unless they said so.
         -- An AI plan they asked for follows the school's setting unless
         -- they chose either way.
         share_allowed = case when p_origin = 'teacher' then coalesce(p_share, false)
                              else p_share end
   where id = pid;
  return pid;
end; $$;

grant execute on function public.lk_save_own_plan(jsonb, jsonb, text, text, boolean, text) to anon, authenticated;
