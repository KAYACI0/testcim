begin;
select plan(4);

create temporary table fx (key text primary key, id uuid);
insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-omr@test.local')),
  ('owner_b', tests.create_user('owner-b-omr@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A O');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B O');

select tests.as_user((select id from fx where key = 'owner_a'));

with t as (
  insert into public.tests (workspace_id, created_by, title, type)
  values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'owner_a'), 'OMR Test', 'exam')
  returning id
)
insert into fx (key, id) select 'test_a', id from t;

with s as (
  insert into public.omr_sessions (workspace_id, test_id)
  values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'test_a'))
  returning id
)
insert into fx (key, id) select 'session_a', id from s;

insert into public.omr_scans (workspace_id, session_id, answers)
values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'session_a'), '{}'::jsonb);

select is(
  (select count(*)::int from public.omr_scans where workspace_id = (select id from fx where key = 'ws_a')),
  1, 'owner_a (editor+) can create an omr_scan in their own workspace'
);

select tests.as_user((select id from fx where key = 'owner_b'));
select is(
  (select count(*)::int from public.omr_sessions where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a omr_sessions'
);
select is(
  (select count(*)::int from public.omr_scans where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a omr_scans'
);
select throws_ok(
  format(
    $sql$insert into public.omr_scans (workspace_id, session_id, answers) values (%L, %L, '{}'::jsonb)$sql$,
    (select id from fx where key = 'ws_a'), (select id from fx where key = 'session_a')
  ),
  'cross-tenant: owner_b cannot insert an omr_scan into ws_a'
);

select * from finish();
rollback;
