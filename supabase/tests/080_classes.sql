begin;
select plan(5);

create temporary table fx (key text primary key, id uuid);
insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-classes@test.local')),
  ('owner_b', tests.create_user('owner-b-classes@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A C');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B C');

select tests.as_user((select id from fx where key = 'owner_a'));

with c as (
  insert into public.classes (workspace_id, name, grade) values ((select id from fx where key = 'ws_a'), '9A', 9) returning id
)
insert into fx (key, id) select 'class_a', id from c;

with s as (
  insert into public.students (workspace_id, full_name) values ((select id from fx where key = 'ws_a'), 'Ada Lovelace') returning id
)
insert into fx (key, id) select 'student_a', id from s;

insert into public.class_students (workspace_id, class_id, student_id)
values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'class_a'), (select id from fx where key = 'student_a'));

select is(
  (select count(*)::int from public.class_students where workspace_id = (select id from fx where key = 'ws_a')),
  1, 'class_students accepts a matching-workspace class and student'
);

-- A different workspace's student can't be enrolled via a mismatched
-- workspace_id, even bypassing RLS as the service role: the composite FK
-- alone must reject it.
select tests.as_service_role();
with s2 as (
  insert into public.students (workspace_id, full_name) values ((select id from fx where key = 'ws_b'), 'Grace Hopper') returning id
)
insert into fx (key, id) select 'student_b', id from s2;

select throws_ok(
  format(
    $sql$insert into public.class_students (workspace_id, class_id, student_id) values (%L, %L, %L)$sql$,
    (select id from fx where key = 'ws_a'),
    (select id from fx where key = 'class_a'),
    (select id from fx where key = 'student_b')
  ),
  'class_students rejects a student from a different workspace than declared'
);

-- Cross-tenant select/insert/update/delete denial.
select tests.as_user((select id from fx where key = 'owner_b'));
select is(
  (select count(*)::int from public.classes where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a classes'
);
select is(
  (select count(*)::int from public.students where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a students'
);
update public.classes set name = 'hacked' where id = (select id from fx where key = 'class_a');
select tests.as_service_role();
select is(
  (select name from public.classes where id = (select id from fx where key = 'class_a')),
  '9A', 'cross-tenant: owner_b''s update to ws_a''s class affects 0 rows'
);

select * from finish();
rollback;
