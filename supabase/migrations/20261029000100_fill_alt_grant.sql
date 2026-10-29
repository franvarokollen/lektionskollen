-- lk_fill_alt saves the other language of a plan after a feedback fix
-- (lk-feedback.ts, useFix). It was only ever granted to signed-in users, so in
-- the demo — where everyone is anon — the call failed without a word and the
-- fixed plan lost its translation. It is scoped to the caller's own school
-- (20261028d), like every other demo-callable writer.
grant execute on function public.lk_fill_alt(uuid, text, jsonb) to anon;
