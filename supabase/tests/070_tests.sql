begin;
select plan(9);

create temporary table fx (key text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-tests@test.local')),
  ('owner_b', tests.create_user('owner-b-tests@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A T');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B T');

select tests.as_user((select id from fx where key = 'owner_a'));

with q as (
  insert into public.questions (workspace_id, kind, question_type, stem_text, options, correct)
  values ((select id from fx where key = 'ws_a'), 'rich', 'mcq', 'Soru', '[]'::jsonb, '{}'::jsonb)
  returning id
)
insert into fx (key, id) select 'question_a', id from q;

insert into fx (key, id)
select 'question_revision_a', id from public.question_revisions
where question_id = (select id from fx where key = 'question_a') and revision = 1;

with t as (
  insert into public.tests (workspace_id, created_by, title, type)
  values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'owner_a'), 'T1', 'test_paper')
  returning id
)
insert into fx (key, id) select 'test_a', id from t;

-- Direct writes to test content are blocked; only apply_test_ops may write.
select throws_ok(
  format(
    $sql$insert into public.test_items (workspace_id, test_id, question_id, question_revision_id, position)
         values (%L, %L, %L, %L, 'a0')$sql$,
    (select id from fx where key = 'ws_a'), (select id from fx where key = 'test_a'),
    (select id from fx where key = 'question_a'), (select id from fx where key = 'question_revision_a')
  ),
  null::char(5),
  null::text,
  'direct insert into test_items is blocked; only apply_test_ops may write it'
);

-- Happy path: add_item.
select is(
  (
    public.apply_test_ops(
      (select id from fx where key = 'test_a'), 1,
      jsonb_build_array(jsonb_build_object(
        'type', 'add_item',
        'question_id', (select id from fx where key = 'question_a'),
        'question_revision_id', (select id from fx where key = 'question_revision_a'),
        'position', 'a0'
      ))
    ) ->> 'current_revision'
  )::int,
  2, 'apply_test_ops: add_item succeeds and bumps the revision to 2'
);
select is(
  (select question_count from public.tests where id = (select id from fx where key = 'test_a')),
  1, 'apply_test_ops: add_item is reflected in question_count'
);

-- Conflict path: base_revision is stale.
select is(
  public.apply_test_ops((select id from fx where key = 'test_a'), 1, '[]'::jsonb) ->> 'ok',
  'false', 'apply_test_ops: a stale base_revision is rejected'
);
select is(
  (public.apply_test_ops((select id from fx where key = 'test_a'), 1, '[]'::jsonb) ->> 'current_revision')::int,
  2, 'apply_test_ops: the conflict response reports the current revision'
);

-- update_title op.
select is(
  public.apply_test_ops(
    (select id from fx where key = 'test_a'), 2,
    jsonb_build_array(jsonb_build_object('type', 'update_title', 'title', 'T1 Renamed'))
  ) ->> 'ok',
  'true', 'apply_test_ops: update_title succeeds'
);
select is(
  (select title from public.tests where id = (select id from fx where key = 'test_a')),
  'T1 Renamed', 'apply_test_ops: update_title is applied'
);

-- Unauthorized: owner_b is not a member of ws_a.
select tests.as_user((select id from fx where key = 'owner_b'));
select throws_ok(
  format(
    $sql$select public.apply_test_ops(%L, 3, '[]'::jsonb)$sql$,
    (select id from fx where key = 'test_a')
  ),
  null::char(5),
  null::text,
  'apply_test_ops: a non-member cannot call it against ws_a''s test'
);

-- Cross-tenant select denial.
select is(
  (select count(*)::int from public.tests where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a tests'
);

select * from finish();
rollback;
