begin;
select plan(8);

create temporary table fx (key text primary key, id uuid);
insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-misc@test.local')),
  ('owner_b', tests.create_user('owner-b-misc@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A M');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B M');

select tests.as_service_role();
insert into public.jobs (kind, payload) values ('cleanup', '{}'::jsonb);
with q as (
  insert into public.questions (workspace_id, kind, question_type, stem_text, options, correct)
  values ((select id from fx where key = 'ws_a'), 'rich', 'mcq', 'Soru', '[]'::jsonb, '{}'::jsonb)
  returning id
)
insert into fx (key, id) select 'question_a', id from q;
insert into public.ai_jobs (workspace_id, kind, status) values ((select id from fx where key = 'ws_a'), 'generate_question', 'queued');

-- `jobs` is a system-only table: no policies at all for anon/authenticated.
select tests.as_user((select id from fx where key = 'owner_a'));
select is(
  (select count(*)::int from public.jobs),
  0, 'jobs: no authenticated user can select any row (system-only table)'
);
select throws_ok(
  $$insert into public.jobs (kind) values ('x')$$,
  'jobs: no authenticated user can insert (system-only table)'
);

-- ai_jobs: select-only for members, cross-tenant denied.
select is(
  (select count(*)::int from public.ai_jobs where workspace_id = (select id from fx where key = 'ws_a')),
  1, 'ai_jobs: a member can see their workspace''s job'
);
select tests.as_user((select id from fx where key = 'owner_b'));
select is(
  (select count(*)::int from public.ai_jobs where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a ai_jobs'
);

-- feedback: members can submit for their own workspace, not another's.
select tests.as_user((select id from fx where key = 'owner_a'));
insert into public.feedback (workspace_id, user_id, body)
values ((select id from fx where key = 'ws_a'), (select id from fx where key = 'owner_a'), 'great app');
select throws_ok(
  format(
    $sql$insert into public.feedback (workspace_id, user_id, body) values (%L, %L, 'x')$sql$,
    (select id from fx where key = 'ws_b'), (select id from fx where key = 'owner_a')
  ),
  'feedback: cannot submit feedback for a workspace you are not a member of'
);

-- question_reports: public insert, workspace_id derived server-side, read
-- restricted to that workspace's admins.
select tests.as_user(null);
insert into public.question_reports (reporter_email, question_id, reason)
values ('reporter@example.com', (select id from fx where key = 'question_a'), 'copyright');

select tests.as_service_role();
select is(
  (
    select workspace_id from public.question_reports
    where question_id = (select id from fx where key = 'question_a')
  ),
  (select id from fx where key = 'ws_a'),
  'question_reports: workspace_id is derived from the reported question'
);

select tests.as_user((select id from fx where key = 'owner_a'));
select is(
  (select count(*)::int from public.question_reports where question_id = (select id from fx where key = 'question_a')),
  1, 'question_reports: the owning workspace''s owner can read the report'
);
select tests.as_user((select id from fx where key = 'owner_b'));
select is(
  (select count(*)::int from public.question_reports where question_id = (select id from fx where key = 'question_a')),
  0, 'question_reports: a different workspace''s owner cannot read the report'
);

select * from finish();
rollback;
