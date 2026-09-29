begin;
select plan(6);

create temporary table fx (key text primary key, id uuid);
insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-exam@test.local')),
  ('owner_b', tests.create_user('owner-b-exam@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A E');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B E');

select tests.as_user((select id from fx where key = 'owner_a'));

with t as (
  insert into public.tests (workspace_id, created_by, title, type)
  values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'owner_a'), 'Exam Test', 'exam')
  returning id
)
insert into fx (key, id) select 'test_a', id from t;

with e as (
  insert into public.online_exams (workspace_id, test_id, title, mode, access, slug)
  values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'test_a'), 'Exam 1', 'async', 'link', 'exam-1-slug')
  returning id
)
insert into fx (key, id) select 'exam_a', id from e;

-- The exam creator (a member) can see it; a different workspace's owner cannot.
select ok(
  (select count(*)::int from public.online_exams where id = (select id from fx where key = 'exam_a')) = 1,
  'owner_a (member) can see their own online_exams row'
);

select tests.as_user((select id from fx where key = 'owner_b'));
select is(
  (select count(*)::int from public.online_exams where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a online_exams'
);

-- Anonymous student flow: no client-facing write policy exists at all on
-- exam_attempts/attempt_answers, per docs/02 §5.3 (server-only, service role).
select tests.as_user(null);
select is(
  (select count(*)::int from public.exam_attempts where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'anon has no select access to exam_attempts'
);
select throws_ok(
  format(
    $sql$insert into public.exam_attempts (workspace_id, online_exam_id, token_hash)
         values (%L, %L, 'tok')$sql$,
    (select id from fx where key = 'ws_a'), (select id from fx where key = 'exam_a')
  ),
  'anon cannot insert into exam_attempts directly'
);

select tests.as_user((select id from fx where key = 'owner_a'));
select throws_ok(
  format(
    $sql$insert into public.exam_attempts (workspace_id, online_exam_id, token_hash)
         values (%L, %L, 'tok2')$sql$,
    (select id from fx where key = 'ws_a'), (select id from fx where key = 'exam_a')
  ),
  'even a workspace member cannot insert into exam_attempts directly; only the service role can'
);

-- The service role (the only writer in this flow) can insert.
select tests.as_service_role();
insert into public.exam_attempts (workspace_id, online_exam_id, token_hash)
values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'exam_a'), 'tok3');
select is(
  (select count(*)::int from public.exam_attempts where workspace_id = (select id from fx where key = 'ws_a')),
  1, 'the service role can write exam_attempts (server-only flow)'
);

select * from finish();
rollback;
