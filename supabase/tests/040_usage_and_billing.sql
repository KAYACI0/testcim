begin;
select plan(9);

create temporary table fx (key text primary key, id uuid);
grant all on fx to anon, authenticated, service_role;
insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-billing@test.local')),
  ('owner_b', tests.create_user('owner-b-billing@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A Billing');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B Billing');

-- Cross-tenant select denial.
select tests.as_user((select id from fx where key = 'owner_b'));
select is(
  (select count(*)::int from public.usage_counters where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a usage_counters'
);
select is(
  (select count(*)::int from public.credit_ledger where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a credit_ledger'
);
select is(
  (select count(*)::int from public.audit_log where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a audit_log'
);
select is(
  (select count(*)::int from public.subscriptions where workspace_id = (select id from fx where key = 'ws_a')),
  0, 'cross-tenant: owner_b cannot see ws_a subscriptions'
);

-- increment_usage: the free plan caps pdf_exports_per_month at 10.
select tests.as_user((select id from fx where key = 'owner_a'));
select is(
  public.increment_usage((select id from fx where key = 'ws_a'), 'pdf_exports_per_month', 10),
  10::bigint,
  'increment_usage: reaching the exact limit succeeds'
);

select throws_ok(
  format($sql$select public.increment_usage(%L, 'pdf_exports_per_month', 1)$sql$, (select id from fx where key = 'ws_a')),
  'P0001',
  null::text,
  'increment_usage: exceeding the limit raises usage_limit_exceeded'
);

select is(
  (
    select value from public.usage_counters
    where workspace_id = (select id from fx where key = 'ws_a')
      and metric = 'pdf_exports_per_month'
      and period_start = date_trunc('month', now())::date
  ),
  10::bigint,
  'increment_usage: the failed attempt rolled back, counter stays at the limit'
);

-- spend_credits: no credits granted yet, so any spend is insufficient.
select throws_ok(
  format($sql$select public.spend_credits(%L, 5, 'test-spend')$sql$, (select id from fx where key = 'ws_a')),
  'P0001',
  null::text,
  'spend_credits: insufficient balance raises insufficient_credits'
);

-- Grant credits as the service role (simulating a top-up), then spend.
select tests.as_service_role();
insert into public.credit_ledger (workspace_id, delta, reason)
values ((select id from fx where key = 'ws_a'), 10, 'grant');

select tests.as_user((select id from fx where key = 'owner_a'));
select is(
  public.spend_credits((select id from fx where key = 'ws_a'), 5, 'test-spend'),
  5::bigint,
  'spend_credits: spending within balance succeeds and returns the remaining balance'
);

select * from finish();
rollback;
