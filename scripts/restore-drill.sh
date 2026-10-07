#!/usr/bin/env bash
# Local restore drill: dump the running local Supabase database, restore it into a scratch
# database and compare the row count of every public table. Run after `pnpm db:start` (and
# ideally `pnpm db:reset`). Production needs the same steps against a real backup, see
# docs/runbook.md section 5.1.
#
#   bash scripts/restore-drill.sh
set -euo pipefail

PROJECT_ID="$(sed -n 's/^project_id *= *"\(.*\)"/\1/p' supabase/config.toml | head -1)"
CONTAINER="supabase_db_${PROJECT_ID}"
SCRATCH="restore_drill"
STARTED="$(date +%s)"

run_psql() {
  MSYS_NO_PATHCONV=1 docker exec -i "$CONTAINER" psql -U postgres -v ON_ERROR_STOP=1 -At "$@"
}

counts() {
  local db="$1"
  run_psql -d "$db" -c "
    select format('%I.%I', schemaname, relname) || '=' ||
           (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', schemaname, relname), false, true, '')))[1]::text
    from pg_stat_user_tables
    where schemaname = 'public'
    order by 1;"
}

echo "Dumping postgres database from ${CONTAINER}"
MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" pg_dump -U postgres -d postgres --no-owner --no-privileges \
  --schema=public --schema=storage --schema=auth -f /tmp/restore_drill.sql

echo "Creating scratch database ${SCRATCH}"
run_psql -d postgres -c "drop database if exists ${SCRATCH};" -c "create database ${SCRATCH};"
# Extensions and roles the dump references already exist cluster-wide in the Supabase image.
run_psql -d "$SCRATCH" -c "create schema if not exists extensions; create extension if not exists pgcrypto with schema extensions; create extension if not exists \"uuid-ossp\" with schema extensions; create extension if not exists vector with schema extensions; create extension if not exists pg_trgm with schema extensions;"

echo "Restoring"
MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" psql -U postgres -d "$SCRATCH" -q -f /tmp/restore_drill.sql >/tmp/restore_drill.log 2>&1 || true
# The dump recreates the public schema that a fresh database already has; nothing else is benign.
RESTORE_ERRORS="$(grep -i 'error' /tmp/restore_drill.log | grep -v 'schema "public" already exists' || true)"
if [ -n "$RESTORE_ERRORS" ]; then
  echo "Restore reported errors:"
  printf '%s
' "$RESTORE_ERRORS" | head -20
  exit 1
fi

SOURCE_COUNTS="$(counts postgres)"
RESTORED_COUNTS="$(counts "$SCRATCH")"

run_psql -d postgres -c "drop database ${SCRATCH};" >/dev/null
MSYS_NO_PATHCONV=1 docker exec "$CONTAINER" rm -f /tmp/restore_drill.sql

if [ "$SOURCE_COUNTS" = "$RESTORED_COUNTS" ]; then
  TABLES="$(printf '%s\n' "$SOURCE_COUNTS" | wc -l | tr -d ' ')"
  echo "OK: ${TABLES} public tables, row counts identical, $(( $(date +%s) - STARTED )) seconds"
else
  echo "MISMATCH between source and restored database:"
  diff <(printf '%s\n' "$SOURCE_COUNTS") <(printf '%s\n' "$RESTORED_COUNTS") || true
  exit 1
fi
