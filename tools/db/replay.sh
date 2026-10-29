#!/usr/bin/env bash
# Build the database from the repo alone, on an empty Postgres, and test it.
#
#   PGHOST=… PGPORT=… PGUSER=postgres tools/db/replay.sh [database]
#
# 1. what Supabase provides (roles, auth schema, extensions): supabase-stubs.sql
# 2. every migration in supabase/migrations, in order — the baseline twice in a
#    row, because it must also be safe to run on a database that already has it
# 3. smoke.sql: the behaviour the app relies on
set -euo pipefail
DB="${1:-lk_replay}"
here="$(cd "$(dirname "$0")" && pwd)"
root="$here/../.."
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
run() { psql -v ON_ERROR_STOP=1 -q -d "$DB" "$@"; }
# The stub roles exist once per server; a second database needs only the rest.
if psql -tAc "select 1 from pg_roles where rolname = 'anon'" -d postgres | grep -q 1; then
  tail -n +2 "$here/supabase-stubs.sql" | run -f -
else
  run -f "$here/supabase-stubs.sql"
fi
run -c "alter database $DB set search_path = public, extensions"
migrations=("$root"/supabase/migrations/*.sql)
for m in "${migrations[@]}"; do
  echo "migration $(basename "$m")"
  run -f "$m"
  if [ "$m" = "${migrations[0]}" ]; then
    echo "again: $(basename "$m") (must be a no-op)"
    run -f "$m"
  fi
done
run -f "$here/smoke.sql"
