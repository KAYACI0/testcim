begin;
select plan(6);

create temporary table fx (key text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-rich@test.local')),
  ('owner_b', tests.create_user('owner-b-rich@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A Rich');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B Rich');

select tests.as_user((select id from fx where key = 'owner_a'));

with t as (
  insert into public.tests (workspace_id, created_by, title, type)
  values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'owner_a'), 'T1', 'test_paper')
  returning id
)
insert into fx (key, id) select 'test_a', id from t;

-- Happy path: add_group creates a test_groups row with the given passage.
select is(
  (
    public.apply_test_ops(
      (select id from fx where key = 'test_a'), 1,
      jsonb_build_array(jsonb_build_object(
        'type', 'add_group',
        'group_id', gen_random_uuid(),
        'passage_rich', jsonb_build_object('type', 'doc', 'content', '[]'::jsonb)
      ))
    ) ->> 'current_revision'
  )::int,
  2, 'apply_test_ops: add_group succeeds and bumps the revision to 2'
);
select is(
  (select count(*)::int from public.test_groups where test_id = (select id from fx where key = 'test_a')),
  1, 'apply_test_ops: add_group inserts exactly one test_groups row'
);

insert into fx (key, id)
select 'group_a', id from public.test_groups where test_id = (select id from fx where key = 'test_a');

-- update_group edits the passage of an existing group.
select is(
  public.apply_test_ops(
    (select id from fx where key = 'test_a'), 2,
    jsonb_build_array(jsonb_build_object(
      'type', 'update_group',
      'group_id', (select id from fx where key = 'group_a'),
      'passage_rich', jsonb_build_object('type', 'doc', 'content', jsonb_build_array('x'))
    ))
  ) ->> 'ok',
  'true', 'apply_test_ops: update_group succeeds'
);
select is(
  (select passage_rich ->> 'type' from public.test_groups where id = (select id from fx where key = 'group_a')),
  'doc', 'apply_test_ops: update_group persists the new passage_rich'
);

-- Direct writes to test_groups are still blocked; only apply_test_ops may write.
select throws_ok(
  format(
    $sql$insert into public.test_groups (workspace_id, test_id, passage_rich) values (%L, %L, '{}'::jsonb)$sql$,
    (select id from fx where key = 'ws_a'), (select id from fx where key = 'test_a')
  ),
  null::char(5),
  null::text,
  'direct insert into test_groups is blocked; only apply_test_ops may write it'
);

-- Cross-tenant: owner_b is not a member of ws_a and cannot call apply_test_ops
-- against ws_a's test, nor see the group it just wrote.
select tests.as_user((select id from fx where key = 'owner_b'));
select throws_ok(
  format(
    $sql$select public.apply_test_ops(%L, 3, jsonb_build_array(jsonb_build_object('type', 'add_group', 'group_id', gen_random_uuid())))$sql$,
    (select id from fx where key = 'test_a')
  ),
  null::char(5),
  null::text,
  'apply_test_ops: a non-member cannot add_group against ws_a''s test'
);

select * from finish();
rollback;
