-- Extensions used across the schema. Installed into the `extensions` schema
-- (already on `search_path` via supabase/config.toml `extra_search_path`).
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists vector with schema extensions;
create extension if not exists pgtap with schema extensions;

-- pg_cron pins its own `cron` schema and isn't relocatable; don't force it
-- into `extensions`. Objects are referenced as `cron.schedule(...)` etc.
create extension if not exists pg_cron;
