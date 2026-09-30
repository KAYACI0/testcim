begin;
select plan(4);

create temporary table fx (key text primary key, id uuid);
insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-linking@test.local')),
  ('owner_b', tests.create_user('owner-b-linking@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A L');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B L');

select tests.as_user((select id from fx where key = 'owner_a'));

with s as (
  insert into public.students (workspace_id, full_name) values ((select id from fx where key = 'ws_a'), 'Ada Lovelace') returning id
)
insert into fx (key, id) select 'student_a', id from s;

with t as (
  insert into public.tests (workspace_id, title, type) values ((select id from fx where key = 'ws_a'), 'Quiz A', 'quiz') returning id
)
insert into fx (key, id) select 'test_a', id from t;

with e as (
  insert into public.online_exams (workspace_id, test_id, title, mode, access, slug)
  values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'test_a'), 'Exam A', 'async', 'link', 'exam-a-linking')
  returning id
)
insert into fx (key, id) select 'exam_a', id from e;

select tests.as_service_role();
with a as (
  insert into public.exam_attempts (workspace_id, online_exam_id, token_hash, status)
  values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'exam_a'), 'token-hash-linking', 'submitted')
  returning id
)
insert into fx (key, id) select 'attempt_a', id from a;

select tests.as_user((select id from fx where key = 'owner_a'));

select is(
  (
    select (public.link_attempts_to_students(
      (select id from fx where key = 'ws_a'),
      jsonb_build_array(jsonb_build_object(
        'kind', 'exam_attempt',
        'id', (select id from fx where key = 'attempt_a'),
        'studentId', (select id from fx where key = 'student_a')
      ))
    ) ->> 'linked')::int
  ),
  1, 'link_attempts_to_students links an exam_attempt to a student'
);

select is(
  (select student_id from public.exam_attempts where id = (select id from fx where key = 'attempt_a')),
  (select id from fx where key = 'student_a'),
  'exam_attempts.student_id is set after linking'
);

select tests.as_user((select id from fx where key = 'owner_b'));
select throws_ok(
  format(
    $sql$select public.link_attempts_to_students(%L, '[]'::jsonb)$sql$,
    (select id from fx where key = 'ws_a')
  ),
  '42501',
  'cross-tenant: owner_b cannot call link_attempts_to_students for ws_a'
);

select throws_ok(
  format(
    $sql$select public.link_attempts_to_students(%L, jsonb_build_array(jsonb_build_object('kind', 'exam_attempt', 'id', %L, 'studentId', %L)))$sql$,
    (select id from fx where key = 'ws_b'),
    (select id from fx where key = 'attempt_a'),
    (select id from fx where key = 'student_a')
  ),
  'P0001',
  'cross-tenant: owner_b cannot link ws_a''s student into a ws_b-scoped call'
);

select * from finish();
rollback;
