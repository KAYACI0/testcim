-- apply_test_ops() must enforce questions_per_test (Prompt 04 acceptance
-- criteria: "kota aşımında sunucu reddeder"). Overrides the workspace's
-- entitlement to a tiny cap via `settings.entitlement_overrides` so the
-- test doesn't need to insert dozens of items to hit the free plan's cap.

begin;
select plan(4);

create temporary table fx (key text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx (key, id) values ('owner_a', tests.create_user('owner-a-quota@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A Quota');

select tests.as_user((select id from fx where key = 'owner_a'));

update public.workspaces
set settings = jsonb_build_object('entitlement_overrides', jsonb_build_object('questions_per_test', 1))
where id = (select id from fx where key = 'ws_a');

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

-- First item fits under the (overridden) cap of 1.
select is(
  public.apply_test_ops(
    (select id from fx where key = 'test_a'), 1,
    jsonb_build_array(jsonb_build_object(
      'type', 'add_item',
      'question_id', (select id from fx where key = 'question_a'),
      'question_revision_id', (select id from fx where key = 'question_revision_a'),
      'position', 'a0'
    ))
  ) ->> 'ok',
  'true', 'apply_test_ops: first add_item fits under the cap'
);

-- Second item pushes the test over the cap.
select throws_ok(
  format(
    $sql$select public.apply_test_ops(%L, 2, jsonb_build_array(jsonb_build_object(
      'type', 'add_item',
      'question_id', %L,
      'question_revision_id', %L,
      'position', 'a1'
    )))$sql$,
    (select id from fx where key = 'test_a'),
    (select id from fx where key = 'question_a'),
    (select id from fx where key = 'question_revision_a')
  ),
  'P0001',
  null::text,
  'apply_test_ops: usage_limit_exceeded once questions_per_test is hit'
);

-- The rejected batch inserted nothing.
select is(
  (select count(*)::int from public.test_items where test_id = (select id from fx where key = 'test_a')),
  1, 'apply_test_ops: a quota-rejected batch does not partially apply'
);
select is(
  (select question_count from public.tests where id = (select id from fx where key = 'test_a')),
  1, 'apply_test_ops: question_count is unaffected by the rejected batch'
);

select * from finish();
rollback;
