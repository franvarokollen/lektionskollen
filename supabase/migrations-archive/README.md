# Archived migrations

How the Lektionskollen database got to where `supabase/migrations/20261029000000_lk_baseline.sql`
starts. Kept for history and for `git blame` on a function's reasoning; **not run**.

They could not rebuild the database on their own: the first tables were created
outside migrations, so replaying these on an empty database fails. The baseline
was taken from the live project (tools/db/dump.sql) after 20261028d was applied,
and CI proves it rebuilds everything from nothing.
