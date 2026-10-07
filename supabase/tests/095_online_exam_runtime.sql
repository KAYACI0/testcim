-- check_exam_rate_limit() and the close_expired_exams() auto-submit
-- extension added in 20250101000017_online_exam_runtime.sql.

begin;
select plan(8);

create temporary table fx (key text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx (key, id) values ('owner_a', tests.create_user('owner-a-exam-rt@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A ERT');

select tests.as_user((select id from fx where key = 'owner_a'));
with t as (
  insert into public.tests (workspace_id, created_by, title, type)
  values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'owner_a'), 'Exam RT', 'exam')
  returning id
)
insert into fx (key, id) select 'test_a', id from t;

with e as (
  insert into public.online_exams (workspace_id, test_id, title, mode, access, slug, status, closes_at)
  values (
    (select id from fx where key = 'ws_a'), (select id from fx where key = 'test_a'), 'Exam RT', 'async', 'link',
    'exam-rt-slug', 'open', now() - interval '1 minute'
  )
  returning id
)
insert into fx (key, id) select 'exam_a', id from e;

-- Rate limit: first 3 calls under a limit of 3 pass, the 4th within the same
-- window fails.
select is(public.check_exam_rate_limit('test-bucket', 3, 60), true, 'call 1/3 is allowed');
select is(public.check_exam_rate_limit('test-bucket', 3, 60), true, 'call 2/3 is allowed');
select is(public.check_exam_rate_limit('test-bucket', 3, 60), true, 'call 3/3 is allowed');
select is(public.check_exam_rate_limit('test-bucket', 3, 60), false, 'call 4/3 within the window is rejected');

-- Auto-submit: an in_progress attempt under an exam whose closes_at has
-- already passed gets expired by close_expired_exams().
select tests.as_service_role();
with a as (
  insert into public.exam_attempts (workspace_id, online_exam_id, token_hash, status)
  values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'exam_a'), 'tok-rt', 'in_progress')
  returning id
)
insert into fx (key, id) select 'attempt_a', id from a;

select public.close_expired_exams();

select is(
  (select status from public.online_exams where id = (select id from fx where key = 'exam_a')),
  'closed', 'close_expired_exams closes an exam past its closes_at'
);
select is(
  (select status from public.exam_attempts where id = (select id from fx where key = 'attempt_a')),
  'expired', 'close_expired_exams auto-expires an in_progress attempt under a closed exam'
);

-- online_exam_items: an editor in ws_a can publish (insert) items; a member
-- of another workspace cannot see or insert them.
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

insert into public.online_exam_items (workspace_id, online_exam_id, question_id, question_revision_id, position)
values (
  (select id from fx where key = 'ws_a'), (select id from fx where key = 'exam_a'),
  (select id from fx where key = 'question_a'), (select id from fx where key = 'question_revision_a'), 'a0'
);

insert into fx (key, id) values ('owner_c', tests.create_user('owner-c-exam-rt@test.local'));
insert into fx (key, id) select 'ws_c', tests.create_workspace((select id from fx where key = 'owner_c'), 'WS C ERT');
select tests.as_user((select id from fx where key = 'owner_c'));
select is(
  (select count(*)::int from public.online_exam_items where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_c cannot see ws_a online_exam_items'
);
select throws_ok(
  format(
    $sql$insert into public.online_exam_items (workspace_id, online_exam_id, question_id, question_revision_id, position)
         values (%L, %L, %L, %L, 'a1')$sql$,
    (select id from fx where key = 'ws_a'), (select id from fx where key = 'exam_a'),
    (select id from fx where key = 'question_a'), (select id from fx where key = 'question_revision_a')
  ),
  null::char(5),
  null::text,
  'cross-tenant: owner_c cannot publish an item into ws_a'
);

select * from finish();
rollback;
