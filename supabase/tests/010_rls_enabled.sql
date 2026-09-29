-- Acceptance criteria: no table in `public` may be missing RLS.
begin;
select plan(1);

select is(
  (
    select count(*)::int
    from pg_tables
    where schemaname = 'public'
      and rowsecurity = false
  ),
  0,
  'every table in public has row level security enabled'
);

select * from finish();
rollback;
