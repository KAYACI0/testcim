begin;
select plan(7);

create temporary table fx (key text primary key, id uuid);
insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-restore@test.local')),
  ('editor_a', tests.create_user('editor-a-restore@test.local')),
  ('owner_b', tests.create_user('owner-b-restore@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A RS');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B RS');

select tests.as_service_role();
insert into public.workspace_members (workspace_id, user_id, role)
values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'editor_a'), 'editor');

select tests.as_user((select id from fx where key = 'owner_a'));

with q as (
  insert into public.questions (workspace_id, kind, question_type, stem_text, options, correct)
  values ((select id from fx where key = 'ws_a'), 'rich', 'mcq', 'Soru', '[]'::jsonb, '{}'::jsonb)
  returning id
)
insert into fx (key, id) select 'question_a', id from q;

insert into fx (key, id)
select 'revision_a', id from public.question_revisions
where question_id = (select id from fx where key = 'question_a');

with t as (
  insert into public.tests (workspace_id, title, type) values ((select id from fx where key = 'ws_a'), 'Quiz A', 'quiz') returning id
)
insert into fx (key, id) select 'test_a', id from t;

insert into fx (key, id) select 'item_a', gen_random_uuid();

-- Revision 1 -> 2: add one item.
select public.apply_test_ops(
  (select id from fx where key = 'test_a'), 1,
  jsonb_build_array(jsonb_build_object(
    'type', 'add_item',
    'item_id', (select id from fx where key = 'item_a'),
    'question_id', (select id from fx where key = 'question_a'),
    'question_revision_id', (select id from fx where key = 'revision_a'),
    'position', 'a0'
  ))
);

select is(
  (select count(*)::int from public.test_items where test_id = (select id from fx where key = 'test_a')),
  1, 'apply_test_ops adds the item'
);
select is(
  (
    select jsonb_array_length(full_state -> 'test_items')
    from public.test_snapshots
    where test_id = (select id from fx where key = 'test_a') and revision = 2
  ),
  1, 'revision 2''s full_state captures the one test_item'
);

-- Revision 2 -> 3: remove the item.
select public.apply_test_ops(
  (select id from fx where key = 'test_a'), 2,
  jsonb_build_array(jsonb_build_object('type', 'remove_item', 'item_id', (select id from fx where key = 'item_a')))
);

select is(
  (select count(*)::int from public.test_items where test_id = (select id from fx where key = 'test_a')),
  0, 'apply_test_ops removes the item'
);

-- editor_a cannot restore (owner/admin only).
select tests.as_user((select id from fx where key = 'editor_a'));
select throws_ok(
  format($sql$select public.restore_test_snapshot(%L, 2)$sql$, (select id from fx where key = 'test_a')),
  '42501', 'an editor cannot restore a snapshot'
);

-- owner_b cannot restore ws_a's test.
select tests.as_user((select id from fx where key = 'owner_b'));
select throws_ok(
  format($sql$select public.restore_test_snapshot(%L, 2)$sql$, (select id from fx where key = 'test_a')),
  '42501', 'cross-tenant: owner_b cannot restore ws_a''s snapshot'
);

-- owner_a restores revision 2 (the item existed).
select tests.as_user((select id from fx where key = 'owner_a'));
select public.restore_test_snapshot((select id from fx where key = 'test_a'), 2);

select is(
  (select count(*)::int from public.test_items where test_id = (select id from fx where key = 'test_a')),
  1, 'restore_test_snapshot brings the removed item back'
);
select is(
  (select revision from public.tests where id = (select id from fx where key = 'test_a')),
  4, 'restore_test_snapshot records the restore as a new revision, not a rewrite'
);

select * from finish();
rollback;
