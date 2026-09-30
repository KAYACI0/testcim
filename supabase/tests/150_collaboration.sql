begin;
select plan(8);

create temporary table fx (key text primary key, id uuid);
insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-collab@test.local')),
  ('editor_a', tests.create_user('editor-a-collab@test.local')),
  ('owner_b', tests.create_user('owner-b-collab@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A CO');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B CO');

select tests.as_service_role();
insert into public.workspace_members (workspace_id, user_id, role)
values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'editor_a'), 'editor');

select tests.as_user((select id from fx where key = 'owner_a'));

with c as (
  insert into public.comments (workspace_id, resource_type, resource_id, author_id, body)
  values (
    (select id from fx where key = 'ws_a'), 'test', gen_random_uuid(),
    (select id from fx where key = 'owner_a'), 'Bu soruyu kontrol edelim @editor_a'
  )
  returning id
)
insert into fx (key, id) select 'comment_a', id from c;

select is(
  (select author_id from public.comments where id = (select id from fx where key = 'comment_a')),
  (select id from fx where key = 'owner_a'), 'a comment records its author'
);

select throws_ok(
  format(
    $sql$insert into public.comments (workspace_id, resource_type, resource_id, author_id, body) values (%L, 'test', gen_random_uuid(), %L, 'spoofed')$sql$,
    (select id from fx where key = 'ws_a'),
    (select id from fx where key = 'editor_a')
  ),
  '42501', 'a comment insert cannot claim a different author_id than the caller'
);

select public.notify_comment_mentions(
  (select id from fx where key = 'ws_a'),
  (select id from fx where key = 'comment_a'),
  array[(select id from fx where key = 'editor_a')]::uuid[]
);

select is(
  (select count(*)::int from public.comment_mentions where comment_id = (select id from fx where key = 'comment_a')),
  1, 'notify_comment_mentions records the mention'
);

select tests.as_user((select id from fx where key = 'editor_a'));
select is(
  (select count(*)::int from public.notifications where user_id = (select id from fx where key = 'editor_a')),
  1, 'the mentioned member can see their own notification'
);

select tests.as_user((select id from fx where key = 'owner_a'));
select is(
  (select count(*)::int from public.notifications where user_id = (select id from fx where key = 'editor_a')),
  0, 'another workspace member cannot see someone else''s notification row'
);

select tests.as_user((select id from fx where key = 'owner_b'));
select is(
  (select count(*)::int from public.comments where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a comments'
);
select throws_ok(
  format(
    $sql$select public.notify_comment_mentions(%L, %L, array[]::uuid[])$sql$,
    (select id from fx where key = 'ws_a'),
    (select id from fx where key = 'comment_a')
  ),
  '42501', 'cross-tenant: owner_b cannot call notify_comment_mentions for ws_a'
);

select tests.as_user((select id from fx where key = 'owner_a'));
update public.comments set resolved_at = now(), resolved_by = (select id from fx where key = 'owner_a')
where id = (select id from fx where key = 'comment_a');
select isnt(
  (select resolved_at from public.comments where id = (select id from fx where key = 'comment_a')),
  null, 'an admin can resolve a comment'
);

select * from finish();
rollback;
