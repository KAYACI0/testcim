begin;
select plan(13);

create temporary table fx (key text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;

insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a@test.local')),
  ('editor_a', tests.create_user('editor-a@test.local')),
  ('viewer_a', tests.create_user('viewer-a@test.local')),
  ('owner_b', tests.create_user('owner-b@test.local')),
  ('new_member', tests.create_user('new-member-a@test.local'));

insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B');

select tests.add_member((select id from fx where key = 'ws_a'), (select id from fx where key = 'editor_a'), 'editor');
select tests.add_member((select id from fx where key = 'ws_a'), (select id from fx where key = 'viewer_a'), 'viewer');

-- Cross-tenant: owner_b has no visibility into workspace A at all.
select tests.as_user((select id from fx where key = 'owner_b'));

select is(
  (select count(*)::int from public.workspaces where id = (select id from fx where key = 'ws_a')),
  0,
  'cross-tenant select: owner_b cannot see workspace A'
);

select is(
  (select count(*)::int from public.workspace_members where workspace_id = (select id from fx where key = 'ws_a')),
  0,
  'cross-tenant select: owner_b cannot see workspace A membership'
);

select throws_ok(
  format(
    $sql$insert into public.workspace_members (workspace_id, user_id, role) values (%L, %L, 'admin')$sql$,
    (select id from fx where key = 'ws_a'),
    (select id from fx where key = 'owner_b')
  ),
  null::char(5),
  null::text,
  'cross-tenant insert: owner_b cannot add themself to workspace A'
);

update public.workspaces set name = 'hacked' where id = (select id from fx where key = 'ws_a');
delete from public.workspaces where id = (select id from fx where key = 'ws_a');

-- owner_b can't see workspace A at all, so verify the ground truth as the
-- service role (bypasses RLS) rather than through owner_b's own blind spot.
select tests.as_service_role();
select is(
  (select name from public.workspaces where id = (select id from fx where key = 'ws_a')),
  'WS A',
  'cross-tenant update: owner_b''s update to workspace A affects 0 rows'
);
select is(
  (select count(*)::int from public.workspaces where id = (select id from fx where key = 'ws_a')),
  1,
  'cross-tenant delete: owner_b cannot delete workspace A'
);
select tests.as_user((select id from fx where key = 'owner_b'));

-- Role matrix inside workspace A: only owner/admin can manage membership.
select tests.as_user((select id from fx where key = 'viewer_a'));
select throws_ok(
  format(
    $sql$insert into public.workspace_members (workspace_id, user_id, role) values (%L, gen_random_uuid(), 'viewer')$sql$,
    (select id from fx where key = 'ws_a')
  ),
  null::char(5),
  null::text,
  'role matrix: viewer cannot add members'
);

select tests.as_user((select id from fx where key = 'editor_a'));
select throws_ok(
  format(
    $sql$insert into public.workspace_members (workspace_id, user_id, role) values (%L, gen_random_uuid(), 'viewer')$sql$,
    (select id from fx where key = 'ws_a')
  ),
  null::char(5),
  null::text,
  'role matrix: editor cannot add members'
);

update public.workspaces set settings = '{"x": 1}'::jsonb where id = (select id from fx where key = 'ws_a');
select is(
  (select settings from public.workspaces where id = (select id from fx where key = 'ws_a')),
  '{}'::jsonb,
  'role matrix: editor cannot update workspace settings'
);

select tests.as_user((select id from fx where key = 'owner_a'));
insert into public.workspace_members (workspace_id, user_id, role)
values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'new_member'), 'viewer');
select is(
  (select count(*)::int from public.workspace_members where workspace_id = (select id from fx where key = 'ws_a')),
  4,
  'role matrix: owner can add members'
);

update public.workspaces set settings = '{"x": 1}'::jsonb where id = (select id from fx where key = 'ws_a');
select is(
  (select settings from public.workspaces where id = (select id from fx where key = 'ws_a')),
  '{"x": 1}'::jsonb,
  'role matrix: owner can update workspace settings'
);

-- Safety net: the only owner can't be removed.
select throws_ok(
  format(
    $sql$delete from public.workspace_members where workspace_id = %L and user_id = %L$sql$,
    (select id from fx where key = 'ws_a'),
    (select id from fx where key = 'owner_a')
  ),
  'P0001',
  null::text,
  'last owner cannot be removed from a workspace'
);

-- profiles: co-members can see each other; outsiders can't.
select tests.as_user((select id from fx where key = 'viewer_a'));
select is(
  (select count(*)::int from public.profiles where id = (select id from fx where key = 'owner_a')),
  1,
  'profiles: co-member can see owner_a''s profile'
);

select tests.as_user((select id from fx where key = 'owner_b'));
select is(
  (select count(*)::int from public.profiles where id = (select id from fx where key = 'owner_a')),
  0,
  'profiles: non-co-member cannot see owner_a''s profile'
);

select * from finish();
rollback;
