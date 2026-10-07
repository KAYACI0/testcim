-- Prompt 08: folders cross-tenant denial (not covered by 060_questions.sql,
-- which only exercises questions/tags/outcomes), plus the new
-- `upgrade_revision` apply_test_ops op added in
-- 20250101000016_question_bank.sql.

begin;
select plan(8);

create temporary table fx (key text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-bank@test.local')),
  ('owner_b', tests.create_user('owner-b-bank@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A Bank');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B Bank');

select tests.as_user((select id from fx where key = 'owner_a'));

with f as (
  insert into public.folders (workspace_id, kind, name)
  values ((select id from fx where key = 'ws_a'), 'questions', 'Geometri')
  returning id
)
insert into fx (key, id) select 'folder_a', id from f;

with q as (
  insert into public.questions (workspace_id, folder_id, kind, question_type, stem_text, options, correct)
  values (
    (select id from fx where key = 'ws_a'), (select id from fx where key = 'folder_a'),
    'rich', 'mcq', 'Bir üçgenin iç açıları toplamı kaçtır?', '[]'::jsonb, '{}'::jsonb
  )
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

select public.apply_test_ops(
  (select id from fx where key = 'test_a'), 1,
  jsonb_build_array(jsonb_build_object(
    'type', 'add_item', 'item_id', gen_random_uuid(),
    'question_id', (select id from fx where key = 'question_a'),
    'question_revision_id', (select id from fx where key = 'question_revision_a'),
    'position', 'a0'
  ))
);
insert into fx (key, id)
select 'item_a', id from public.test_items where test_id = (select id from fx where key = 'test_a');

-- Cross-tenant: owner_b cannot see ws_a's folder.
select tests.as_user((select id from fx where key = 'owner_b'));
select is(
  (select count(*)::int from public.folders where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a folders'
);
select throws_ok(
  format(
    $sql$insert into public.folders (workspace_id, kind, name) values (%L, 'questions', 'x')$sql$,
    (select id from fx where key = 'ws_a')
  ),
  null::char(5),
  null::text,
  'cross-tenant: owner_b cannot create a folder in ws_a'
);
-- apply_test_ops itself is workspace-scoped by test_id, so an outsider
-- cannot use it to touch ws_a's test_items either.
select throws_ok(
  format(
    $sql$select public.apply_test_ops(%L, 2, jsonb_build_array(jsonb_build_object('type', 'upgrade_revision', 'item_id', %L)))$sql$,
    (select id from fx where key = 'test_a'),
    (select id from fx where key = 'item_a')
  ),
  '42501',
  null::text,
  'cross-tenant: owner_b cannot call apply_test_ops against ws_a''s test'
);

-- Back to owner_a: thumb_asset_id is a plain nullable column.
select tests.as_user((select id from fx where key = 'owner_a'));
select is(
  (select thumb_asset_id from public.questions where id = (select id from fx where key = 'question_a')),
  null, 'thumb_asset_id defaults to null'
);

-- Editing the question bumps its revision; upgrade_revision moves the
-- (unpinned) test_item onto the new revision.
update public.questions
set stem_text = 'Bir üçgenin iç açıları toplamı kaç derecedir?'
where id = (select id from fx where key = 'question_a');

select is(
  (select current_revision from public.questions where id = (select id from fx where key = 'question_a')),
  2, 'editing the stem bumps current_revision to 2'
);
select isnt(
  (select question_revision_id from public.test_items where id = (select id from fx where key = 'item_a')),
  (select id from public.question_revisions where question_id = (select id from fx where key = 'question_a') and revision = 2),
  'the test item is still pinned to revision 1 before upgrading'
);

select public.apply_test_ops(
  (select id from fx where key = 'test_a'), 2,
  jsonb_build_array(jsonb_build_object('type', 'upgrade_revision', 'item_id', (select id from fx where key = 'item_a')))
);

select is(
  (select question_revision_id from public.test_items where id = (select id from fx where key = 'item_a')),
  (select id from public.question_revisions where question_id = (select id from fx where key = 'question_a') and revision = 2),
  'upgrade_revision moves the item onto the question''s current revision'
);

-- A pinned item is left untouched by upgrade_revision (its question is
-- deliberately locked to the printed revision).
-- test_items is select-only for clients; pin it as the service role.
select tests.as_service_role();
update public.test_items set pinned = true where id = (select id from fx where key = 'item_a');
select tests.as_user((select id from fx where key = 'owner_a'));
update public.questions
set stem_text = 'Bir üçgenin iç açıları toplamı 180 derece midir?'
where id = (select id from fx where key = 'question_a');

select public.apply_test_ops(
  (select id from fx where key = 'test_a'), 3,
  jsonb_build_array(jsonb_build_object('type', 'upgrade_revision', 'item_id', (select id from fx where key = 'item_a')))
);

select isnt(
  (select question_revision_id from public.test_items where id = (select id from fx where key = 'item_a')),
  (select id from public.question_revisions where question_id = (select id from fx where key = 'question_a') and revision = 3),
  'upgrade_revision leaves a pinned item on its current revision'
);

select * from finish();
rollback;
