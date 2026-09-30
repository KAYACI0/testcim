begin;
select plan(11);

create temporary table fx (key text primary key, id uuid);
insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-ai-pipeline@test.local')),
  ('owner_b', tests.create_user('owner-b-ai-pipeline@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A AI');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B AI');

-- refund_credits: cross-tenant denied.
select tests.as_user((select id from fx where key = 'owner_b'));
select throws_ok(
  format($sql$select public.refund_credits(%L, 5, 'test-refund')$sql$, (select id from fx where key = 'ws_a')),
  'refund_credits: a non-member cannot refund credits into another workspace'
);

-- refund_credits: a member can refund into their own workspace and the
-- balance goes up.
select tests.as_user((select id from fx where key = 'owner_a'));
select is(
  public.refund_credits((select id from fx where key = 'ws_a'), 5, 'test-refund'),
  5::bigint,
  'refund_credits: refunding into an empty ledger returns the new balance'
);
select is(
  public.refund_credits((select id from fx where key = 'ws_a'), 3, 'test-refund'),
  8::bigint,
  'refund_credits: refunds accumulate'
);

-- create_ai_job: cross-tenant denied.
select tests.as_user((select id from fx where key = 'owner_b'));
select throws_ok(
  format($sql$select public.create_ai_job(%L, 'generate_questions', '{}'::jsonb)$sql$, (select id from fx where key = 'ws_a')),
  'create_ai_job: a non-member cannot create a job in another workspace'
);

-- create_ai_job: a member can, and the row lands as 'running' for their
-- own workspace and user.
select tests.as_user((select id from fx where key = 'owner_a'));
insert into fx (key, id)
select 'job_a', public.create_ai_job((select id from fx where key = 'ws_a'), 'generate_questions', '{"topic":"kesirler"}'::jsonb);

select is(
  (select status from public.ai_jobs where id = (select id from fx where key = 'job_a')),
  'running',
  'create_ai_job: the new job starts running'
);
select is(
  (select workspace_id from public.ai_jobs where id = (select id from fx where key = 'job_a')),
  (select id from fx where key = 'ws_a'),
  'create_ai_job: the job belongs to the calling workspace'
);

-- complete_ai_job: cross-tenant denied.
select tests.as_user((select id from fx where key = 'owner_b'));
select throws_ok(
  format(
    $sql$select public.complete_ai_job(%L, '{}'::jsonb, 'claude-opus-5', 100, 50, 1200, 1)$sql$,
    (select id from fx where key = 'job_a')
  ),
  'complete_ai_job: a non-member cannot complete another workspace''s job'
);

-- complete_ai_job: the owning workspace can complete it.
select tests.as_user((select id from fx where key = 'owner_a'));
select public.complete_ai_job(
  (select id from fx where key = 'job_a'), '{"questions":[]}'::jsonb, 'claude-opus-5', 100, 50, 1200, 1
);
select is(
  (select status from public.ai_jobs where id = (select id from fx where key = 'job_a')),
  'succeeded',
  'complete_ai_job: status moves to succeeded'
);
select is(
  (select credits_charged from public.ai_jobs where id = (select id from fx where key = 'job_a')),
  1,
  'complete_ai_job: credits_charged is recorded'
);

-- fail_ai_job: a second job, failed instead of completed, and cross-tenant
-- denied the same way.
insert into fx (key, id)
select 'job_a2', public.create_ai_job((select id from fx where key = 'ws_a'), 'generate_questions', '{}'::jsonb);

select tests.as_user((select id from fx where key = 'owner_b'));
select throws_ok(
  format($sql$select public.fail_ai_job(%L, 'boom')$sql$, (select id from fx where key = 'job_a2')),
  'fail_ai_job: a non-member cannot fail another workspace''s job'
);

select tests.as_user((select id from fx where key = 'owner_a'));
select public.fail_ai_job((select id from fx where key = 'job_a2'), 'provider_error');
select is(
  (select status from public.ai_jobs where id = (select id from fx where key = 'job_a2')),
  'failed',
  'fail_ai_job: status moves to failed'
);

select * from finish();
rollback;
