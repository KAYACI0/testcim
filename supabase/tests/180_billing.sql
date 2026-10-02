begin;
select plan(20);

create temporary table fx (key text primary key, id uuid);
insert into fx (key, id) values
  ('owner_a', tests.create_user('owner-a-billing2@test.local')),
  ('owner_b', tests.create_user('owner-b-billing2@test.local'));
insert into fx (key, id) select 'ws_a', tests.create_workspace((select id from fx where key = 'owner_a'), 'WS A Billing2');
insert into fx (key, id) select 'ws_b', tests.create_workspace((select id from fx where key = 'owner_b'), 'WS B Billing2');

create or replace function pg_temp.ev(p_id text, p_type text, p_at timestamptz, p_plan text, p_status text, p_extra jsonb default '{}')
returns jsonb language sql as $$
  select jsonb_build_object(
    'provider', 'fake', 'event_id', p_id,
    'workspace_id', (select id from fx where key = 'ws_a'),
    'type', p_type, 'occurred_at', p_at, 'plan_id', p_plan, 'status', p_status,
    'current_period_end', p_at + interval '30 days'
  ) || p_extra
$$;

-- Activation moves the workspace to plus immediately.
select is(public.apply_billing_event(pg_temp.ev('e1', 'subscription.updated', '2030-01-01T00:00:00Z', 'plus', 'active')), 'applied', 'first event is applied');
select is((select plan_id from public.workspaces where id = (select id from fx where key = 'ws_a')), 'plus', 'workspace plan follows the subscription');
select is((select status from public.subscriptions where workspace_id = (select id from fx where key = 'ws_a')), 'active', 'subscription is active');

-- Replay: identical event id is a no-op.
select is(public.apply_billing_event(pg_temp.ev('e1', 'subscription.updated', '2030-01-01T00:00:00Z', 'plus', 'active')), 'duplicate', 'replayed event is a duplicate');
select is((select count(*)::int from public.billing_events where event_id = 'e1'), 1, 'replay does not add a second log row');

-- Credits are granted once for the period.
select is((select coalesce(sum(delta), 0)::int from public.credit_ledger where workspace_id = (select id from fx where key = 'ws_a')), 300, 'plus plan loads its monthly credits');
select is(public.renew_monthly_credits('2030-01-15T00:00:00Z', (select id from fx where key = 'ws_a')), 0, 'renewal is idempotent within a month');

-- Out of order: an older event cannot overwrite newer state.
select is(public.apply_billing_event(pg_temp.ev('e0', 'subscription.updated', '2029-12-01T00:00:00Z', 'pro', 'active')), 'stale', 'older event is stale');
select is((select plan_id from public.workspaces where id = (select id from fx where key = 'ws_a')), 'plus', 'stale event did not change the plan');

-- Upgrade with extra seats raises the seat override.
select public.apply_billing_event(pg_temp.ev('e2', 'subscription.updated', '2030-02-01T00:00:00Z', 'pro', 'active', '{"seats": 6}'));
select is((select plan_id from public.workspaces where id = (select id from fx where key = 'ws_a')), 'pro', 'upgrade applies');
select is((public.get_entitlements((select id from fx where key = 'ws_a')) ->> 'seats')::int, 6, 'seat override above plan seats is reflected');

-- Invoice recorded, and replaying it is harmless.
select public.apply_billing_event(pg_temp.ev('e3', 'payment.succeeded', '2030-02-01T00:00:10Z', 'pro', 'active',
  '{"invoice": {"id": "inv1", "amount_minor": 10000, "currency": "TRY", "status": "paid"}}'));
select public.apply_billing_event(pg_temp.ev('e3b', 'payment.succeeded', '2030-02-01T00:00:11Z', 'pro', 'active',
  '{"invoice": {"id": "inv1", "amount_minor": 10000, "currency": "TRY", "status": "paid"}}'));
select is((select count(*)::int from public.billing_invoices where provider_invoice_id = 'inv1'), 1, 'same invoice id is stored once');

-- Cancel: falls back to free, seat override removed, nothing deleted.
select public.apply_billing_event(pg_temp.ev('e4', 'subscription.canceled', '2030-03-01T00:00:00Z', 'pro', 'canceled'));
select is((select plan_id from public.workspaces where id = (select id from fx where key = 'ws_a')), 'free', 'cancel downgrades to free');
select is((public.get_entitlements((select id from fx where key = 'ws_a')) ->> 'seats')::int, 1, 'seat override is removed on downgrade');

-- Reactivation after cancel works.
select public.apply_billing_event(pg_temp.ev('e5', 'subscription.updated', '2030-04-01T00:00:00Z', 'plus', 'active'));
select is((select plan_id from public.workspaces where id = (select id from fx where key = 'ws_a')), 'plus', 'reactivation restores the plan');

-- Coupon trial.
insert into public.coupons (code, kind, value, plan_id) values ('deneme14', 'trial_days', 14, 'plus');
select tests.as_user((select id from fx where key = 'owner_b'));
select is((public.redeem_coupon((select id from fx where key = 'ws_b'), 'DENEME14') ->> 'kind'), 'trial_days', 'owner redeems a trial coupon (case-insensitive)');
select is((select plan_id from public.workspaces where id = (select id from fx where key = 'ws_b')), 'plus', 'trial grants the coupon plan');
select throws_ok(
  format($sql$select public.redeem_coupon(%L, 'deneme14')$sql$, (select id from fx where key = 'ws_b')),
  'P0001', 'the same workspace cannot redeem twice'
);

-- Cross-tenant: owner_b cannot see or write ws_a billing data.
select is((select count(*)::int from public.billing_invoices where workspace_id = (select id from fx where key = 'ws_a')), 0, 'cross-tenant: invoices hidden');
select throws_ok(
  format($sql$select public.redeem_coupon(%L, 'deneme14')$sql$, (select id from fx where key = 'ws_a')),
  '42501', 'cross-tenant: cannot redeem for another workspace'
);

select * from finish();
rollback;
