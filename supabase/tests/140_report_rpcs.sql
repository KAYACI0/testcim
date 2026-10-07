begin;
select plan(10);

create temporary table fx (key text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-reports@test.local')),
  ('owner_b', tests.create_user('owner-b-reports@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A R');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B R');

select tests.as_service_role();
with subj as (
  insert into public.curriculum_subjects (code, name) values ('TEST-SUBJ-140', 'Test Subject') returning id
), topic as (
  insert into public.curriculum_topics (subject_id, name) select id, 'Cebir' from subj returning id
), outcome as (
  insert into public.curriculum_outcomes (subject_id, topic_id, description)
  select subj.id, topic.id, 'Denklem cozer' from subj, topic
  returning id
)
insert into fx (key, id) select 'outcome_a', id from outcome;

select tests.as_user((select id from fx where key = 'owner_a'));

with c as (
  insert into public.classes (workspace_id, name) values ((select id from fx where key = 'ws_a'), '9A') returning id
)
insert into fx (key, id) select 'class_a', id from c;

with s as (
  insert into public.students (workspace_id, full_name) values ((select id from fx where key = 'ws_a'), 'Ada Lovelace') returning id
)
insert into fx (key, id) select 'student_a', id from s;

insert into public.class_students (workspace_id, class_id, student_id)
values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'class_a'), (select id from fx where key = 'student_a'));

with q as (
  insert into public.questions (workspace_id, kind, question_type, stem_text, options, correct)
  values ((select id from fx where key = 'ws_a'), 'rich', 'mcq', 'Denklem sorusu', '[]'::jsonb, '{}'::jsonb)
  returning id
)
insert into fx (key, id) select 'question_a', id from q;

insert into public.question_outcomes (workspace_id, question_id, outcome_id)
values (
  (select id from fx where key = 'ws_a'),
  (select id from fx where key = 'question_a'),
  (select id from fx where key = 'outcome_a')
);

insert into fx (key, id)
select 'revision_a', id from public.question_revisions
where question_id = (select id from fx where key = 'question_a');

with t as (
  insert into public.tests (workspace_id, title, type) values ((select id from fx where key = 'ws_a'), 'Quiz A', 'quiz') returning id
)
insert into fx (key, id) select 'test_a', id from t;

with e as (
  insert into public.online_exams (workspace_id, test_id, title, mode, access, slug)
  values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'test_a'), 'Exam A', 'async', 'link', 'exam-a-reports')
  returning id
)
insert into fx (key, id) select 'exam_a', id from e;

-- Attempt answers point at the items pinned for the exam (online_exam_items),
-- which clients cannot write; seed them as the service role.
select tests.as_service_role();
with oei as (
  insert into public.online_exam_items (workspace_id, online_exam_id, question_id, question_revision_id, position)
  values (
    (select id from fx where key = 'ws_a'),
    (select id from fx where key = 'exam_a'),
    (select id from fx where key = 'question_a'),
    (select id from fx where key = 'revision_a'),
    'a0'
  )
  returning id
)
insert into fx (key, id) select 'item_a', id from oei;

with a as (
  insert into public.exam_attempts (workspace_id, online_exam_id, student_id, token_hash, status, score, max_score, submitted_at)
  values (
    (select id from fx where key = 'ws_a'),
    (select id from fx where key = 'exam_a'),
    (select id from fx where key = 'student_a'),
    'token-hash-reports',
    'submitted',
    5, 10, now()
  )
  returning id
)
insert into fx (key, id) select 'attempt_a', id from a;

insert into public.attempt_answers (workspace_id, attempt_id, item_id, is_correct, points)
values (
  (select id from fx where key = 'ws_a'),
  (select id from fx where key = 'attempt_a'),
  (select id from fx where key = 'item_a'),
  false, 0
);

select tests.as_user((select id from fx where key = 'owner_a'));

select is(
  (select confrelid::regclass::text from pg_constraint where conname = 'attempt_answers_item_id_fkey'),
  'online_exam_items',
  'attempt_answers.item_id references online_exam_items, the table the exam runtime writes'
);

select is(
  (select (public.get_class_report((select id from fx where key = 'ws_a'), (select id from fx where key = 'class_a')) ->> 'attempt_count')::int),
  1, 'get_class_report counts one scored attempt for the class roster'
);
select is(
  (select (public.get_class_report((select id from fx where key = 'ws_a'), (select id from fx where key = 'class_a')) ->> 'average_percent')::numeric),
  50.0, 'get_class_report computes the average percent score'
);

select is(
  (select jsonb_array_length(public.get_outcome_report((select id from fx where key = 'ws_a'), (select id from fx where key = 'class_a')))),
  1, 'get_outcome_report returns one outcome row'
);
select is(
  (select (public.get_outcome_report((select id from fx where key = 'ws_a'), (select id from fx where key = 'class_a')) -> 0 ->> 'correct_rate_percent')::numeric),
  0.0, 'get_outcome_report computes a 0% correct rate for the wrong answer'
);

select is(
  (select jsonb_array_length(public.get_student_progress((select id from fx where key = 'ws_a'), (select id from fx where key = 'student_a')))),
  1, 'get_student_progress returns one scored exam for the student'
);

select is(
  (select jsonb_array_length(public.get_weak_topics((select id from fx where key = 'ws_a'), (select id from fx where key = 'class_a')))),
  1, 'get_weak_topics returns one weak topic'
);

select tests.as_user((select id from fx where key = 'owner_b'));

select throws_ok(
  format($sql$select public.get_class_report(%L, %L)$sql$, (select id from fx where key = 'ws_a'), (select id from fx where key = 'class_a')),
  '42501',
  null::text,
  'cross-tenant: owner_b cannot call get_class_report for ws_a'
);
select throws_ok(
  format($sql$select public.get_outcome_report(%L, %L)$sql$, (select id from fx where key = 'ws_a'), (select id from fx where key = 'class_a')),
  '42501',
  null::text,
  'cross-tenant: owner_b cannot call get_outcome_report for ws_a'
);
select throws_ok(
  format($sql$select public.get_weak_topics(%L, %L)$sql$, (select id from fx where key = 'ws_a'), (select id from fx where key = 'class_a')),
  '42501',
  null::text,
  'cross-tenant: owner_b cannot call get_weak_topics for ws_a'
);

select * from finish();
rollback;
