begin;
select plan(5);

create temporary table fx (key text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-approval@test.local')),
  ('editor_a', tests.create_user('editor-a-approval@test.local')),
  ('owner_b', tests.create_user('owner-b-approval@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A AP');

select tests.as_service_role();
insert into public.workspace_members (workspace_id, user_id, role)
values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'editor_a'), 'editor');

select tests.as_user((select id from fx where key = 'owner_a'));
with t as (
  insert into public.tests (workspace_id, title, type) values ((select id from fx where key = 'ws_a'), 'Quiz A', 'quiz') returning id
)
insert into fx (key, id) select 'test_a', id from t;

select is(
  (select approval_status from public.tests where id = (select id from fx where key = 'test_a')),
  'draft', 'a new test starts with approval_status draft'
);

select tests.as_user((select id from fx where key = 'editor_a'));
select public.set_test_approval_status((select id from fx where key = 'test_a'), 'in_review');
select is(
  (select approval_status from public.tests where id = (select id from fx where key = 'test_a')),
  'in_review', 'an editor can move a test to in_review'
);

select throws_ok(
  format($sql$select public.set_test_approval_status(%L, 'approved')$sql$, (select id from fx where key = 'test_a')),
  '42501',
  null::text,
  'an editor cannot approve a test'
);

select tests.as_user((select id from fx where key = 'owner_a'));
select public.set_test_approval_status((select id from fx where key = 'test_a'), 'approved');
select is(
  (select approval_status from public.tests where id = (select id from fx where key = 'test_a')),
  'approved', 'an owner can approve a test'
);

select tests.as_user((select id from fx where key = 'owner_b'));
select throws_ok(
  format($sql$select public.set_test_approval_status(%L, 'in_review')$sql$, (select id from fx where key = 'test_a')),
  '42501',
  null::text,
  'cross-tenant: owner_b cannot change ws_a''s test approval status'
);

select * from finish();
rollback;
