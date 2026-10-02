-- Billing (Prompt 13): price configuration, provider-agnostic event log,
-- invoice history, billing profile, coupons/trials, and credit renewal.
--
-- `subscriptions` stays the single source of truth. Every provider webhook is
-- normalized in the app and applied through apply_billing_event(), which is
-- idempotent (billing_events unique key) and order-safe (last_event_at).
-- Writes come only from the service role or the security definer functions
-- below; clients get member-scoped selects.

-- ---------------------------------------------------------------------------
-- Plan prices. Null means "not priced yet"; the owner sets real values with a
-- reviewed SQL migration once pricing is decided (amounts in minor units).
-- ---------------------------------------------------------------------------

alter table public.plans
  add column price_monthly_minor integer check (price_monthly_minor is null or price_monthly_minor >= 0),
  add column price_yearly_minor integer check (price_yearly_minor is null or price_yearly_minor >= 0),
  add column currency text not null default 'TRY',
  add column sort_order integer not null default 0;

update public.plans set sort_order = case id when 'free' then 0 when 'plus' then 1 when 'pro' then 2 else 3 end;

-- ---------------------------------------------------------------------------
-- Subscriptions: provider list, ordering marker, interval, coupon.
-- ---------------------------------------------------------------------------

alter table public.subscriptions drop constraint subscriptions_provider_check;
alter table public.subscriptions
  add constraint subscriptions_provider_check
  check (provider in ('iyzico', 'paddle', 'polar', 'lemonsqueezy', 'fake', 'manual'));

alter table public.subscriptions
  add column last_event_at timestamptz,
  add column billing_interval text not null default 'month' check (billing_interval in ('month', 'year')),
  add column coupon_code text;

-- ---------------------------------------------------------------------------
-- Event log (service role only: RLS on, no policies).
-- ---------------------------------------------------------------------------

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  workspace_id uuid references public.workspaces (id) on delete set null,
  type text not null,
  occurred_at timestamptz not null,
  outcome text not null default 'applied' check (outcome in ('applied', 'stale', 'ignored')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create index billing_events_workspace_id_idx on public.billing_events (workspace_id, created_at desc);

alter table public.billing_events enable row level security;

-- ---------------------------------------------------------------------------
-- Invoice history and corporate billing profile.
-- ---------------------------------------------------------------------------

create table public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  provider text not null,
  provider_invoice_id text not null,
  amount_minor integer not null check (amount_minor >= 0),
  currency text not null default 'TRY',
  status text not null check (status in ('paid', 'failed', 'refunded')),
  period_start timestamptz,
  period_end timestamptz,
  document_url text,
  issued_at timestamptz not null default now(),
  unique (provider, provider_invoice_id)
);

create index billing_invoices_workspace_id_idx on public.billing_invoices (workspace_id, issued_at desc);

create table public.billing_profiles (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  legal_name text not null default '',
  tax_office text not null default '',
  tax_number text not null default '',
  address text not null default '',
  invoice_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.billing_profiles
  for each row execute function public.set_updated_at();

alter table public.billing_invoices enable row level security;
alter table public.billing_profiles enable row level security;

create policy "billing_invoices_select_admins" on public.billing_invoices
  for select to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin']));

create policy "billing_profiles_select_admins" on public.billing_profiles
  for select to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin']));

create policy "billing_profiles_insert_admins" on public.billing_profiles
  for insert to authenticated
  with check (public.has_role(workspace_id, array['owner', 'admin']));

create policy "billing_profiles_update_admins" on public.billing_profiles
  for update to authenticated
  using (public.has_role(workspace_id, array['owner', 'admin']))
  with check (public.has_role(workspace_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- Coupons and trials (server only for coupons; members read own redemptions).
-- ---------------------------------------------------------------------------

create table public.coupons (
  code text primary key check (code = lower(code) and length(code) between 3 and 40),
  kind text not null check (kind in ('trial_days', 'percent')),
  value integer not null check (value > 0),
  plan_id text references public.plans (id),
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redeemed_count integer not null default 0,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (kind <> 'percent' or value <= 100)
);

create table public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_code text not null references public.coupons (code),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  redeemed_by uuid references auth.users (id) on delete set null,
  redeemed_at timestamptz not null default now(),
  unique (coupon_code, workspace_id)
);

alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;

create policy "coupon_redemptions_select_members" on public.coupon_redemptions
  for select to authenticated
  using (public.is_member(workspace_id));

-- ---------------------------------------------------------------------------
-- Credit renewal: one grant and one expiry per workspace per month.
-- ---------------------------------------------------------------------------

create unique index credit_ledger_period_reason_uniq
  on public.credit_ledger (workspace_id, reason)
  where reason ~ '^(monthly_grant|monthly_expire|free_trial_grant)';

create or replace function public.renew_monthly_credits(p_now timestamptz default now(), p_ws uuid default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period text := to_char(p_now, 'YYYY-MM');
  v_ws record;
  v_grant integer;
  v_balance bigint;
  v_count integer := 0;
  v_inserted integer;
begin
  for v_ws in
    select w.id, w.plan_id, p.entitlements
    from public.workspaces w
    join public.plans p on p.id = w.plan_id
    where p_ws is null or w.id = p_ws
  loop
    v_grant := coalesce((v_ws.entitlements ->> 'ai_credits_per_month')::integer, 0);

    if v_ws.plan_id = 'free' then
      -- One-time trial credits, never renewed.
      if v_grant > 0 then
        insert into public.credit_ledger (workspace_id, delta, reason)
        values (v_ws.id, v_grant, 'free_trial_grant')
        on conflict do nothing;
        get diagnostics v_inserted = row_count;
        v_count := v_count + v_inserted;
      end if;
      continue;
    end if;

    -- Pooled / unlimited plans (-1) carry no per-month ledger grant.
    if v_grant <= 0 then
      continue;
    end if;

    perform pg_advisory_xact_lock(hashtext(v_ws.id::text));

    -- Expire what is left from the previous period, then load the new grant.
    if not exists (
      select 1 from public.credit_ledger
      where workspace_id = v_ws.id and reason = 'monthly_expire:' || v_period
    ) and not exists (
      select 1 from public.credit_ledger
      where workspace_id = v_ws.id and reason = 'monthly_grant:' || v_period
    ) then
      select coalesce(sum(delta), 0) into v_balance
      from public.credit_ledger where workspace_id = v_ws.id;

      if v_balance > 0 then
        insert into public.credit_ledger (workspace_id, delta, reason)
        values (v_ws.id, -v_balance::integer, 'monthly_expire:' || v_period);
      end if;

      insert into public.credit_ledger (workspace_id, delta, reason)
      values (v_ws.id, v_grant, 'monthly_grant:' || v_period);
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.renew_monthly_credits(timestamptz, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- apply_billing_event: the only writer of subscription state from providers.
-- p_event keys: provider, event_id, workspace_id, type, occurred_at, plan_id,
-- status, seats, provider_ref, current_period_end, cancel_at_period_end,
-- billing_interval, coupon_code, invoice {id, amount_minor, currency, status,
-- period_start, period_end, document_url}.
-- Returns 'applied', 'duplicate' or 'stale'.
-- ---------------------------------------------------------------------------

create or replace function public.apply_billing_event(p_event jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text := p_event ->> 'provider';
  v_event_id text := p_event ->> 'event_id';
  v_ws uuid := (p_event ->> 'workspace_id')::uuid;
  v_type text := p_event ->> 'type';
  v_at timestamptz := (p_event ->> 'occurred_at')::timestamptz;
  v_inserted integer;
  v_sub public.subscriptions;
  v_plan text;
  v_status text;
  v_effective_plan text;
  v_seats integer;
  v_plan_seats integer;
  v_invoice jsonb := p_event -> 'invoice';
begin
  if v_provider is null or v_event_id is null or v_ws is null or v_type is null or v_at is null then
    raise exception 'invalid_billing_event' using errcode = 'P0001';
  end if;

  insert into public.billing_events (provider, event_id, workspace_id, type, occurred_at, payload)
  values (v_provider, v_event_id, v_ws, v_type, v_at, p_event)
  on conflict (provider, event_id) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return 'duplicate';
  end if;

  perform pg_advisory_xact_lock(hashtext(v_ws::text));

  -- Invoices are facts, recorded even when the state change below is stale.
  if v_invoice is not null and jsonb_typeof(v_invoice) = 'object' then
    insert into public.billing_invoices (
      workspace_id, provider, provider_invoice_id, amount_minor, currency, status,
      period_start, period_end, document_url, issued_at
    ) values (
      v_ws, v_provider, v_invoice ->> 'id', (v_invoice ->> 'amount_minor')::integer,
      coalesce(v_invoice ->> 'currency', 'TRY'), v_invoice ->> 'status',
      (v_invoice ->> 'period_start')::timestamptz, (v_invoice ->> 'period_end')::timestamptz,
      v_invoice ->> 'document_url', v_at
    )
    on conflict (provider, provider_invoice_id) do update
      set status = excluded.status, document_url = coalesce(excluded.document_url, public.billing_invoices.document_url);
  end if;

  if v_type not in ('subscription.updated', 'subscription.canceled') then
    -- Payment-only events do not change subscription state.
    return 'applied';
  end if;

  select * into v_sub from public.subscriptions where workspace_id = v_ws;

  if found and v_sub.last_event_at is not null and v_sub.last_event_at > v_at then
    update public.billing_events set outcome = 'stale'
    where provider = v_provider and event_id = v_event_id;
    return 'stale';
  end if;

  v_plan := coalesce(p_event ->> 'plan_id', v_sub.plan_id, 'free');
  v_status := case when v_type = 'subscription.canceled' then 'canceled'
                   else coalesce(p_event ->> 'status', 'active') end;
  v_seats := greatest(coalesce((p_event ->> 'seats')::integer, v_sub.seats, 1), 1);

  insert into public.subscriptions (
    workspace_id, plan_id, provider, provider_ref, status, seats, current_period_end,
    cancel_at_period_end, billing_interval, coupon_code, last_event_at
  ) values (
    v_ws, v_plan, v_provider, p_event ->> 'provider_ref', v_status, v_seats,
    (p_event ->> 'current_period_end')::timestamptz,
    coalesce((p_event ->> 'cancel_at_period_end')::boolean, false),
    coalesce(p_event ->> 'billing_interval', 'month'), p_event ->> 'coupon_code', v_at
  )
  on conflict (workspace_id) do update set
    plan_id = excluded.plan_id,
    provider = excluded.provider,
    provider_ref = coalesce(excluded.provider_ref, public.subscriptions.provider_ref),
    status = excluded.status,
    seats = excluded.seats,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    billing_interval = excluded.billing_interval,
    coupon_code = coalesce(excluded.coupon_code, public.subscriptions.coupon_code),
    last_event_at = excluded.last_event_at;

  -- Entitlements follow immediately. past_due keeps the plan (grace); a
  -- canceled subscription falls back to free. Content is never deleted.
  v_effective_plan := case when v_status = 'canceled' then 'free' else v_plan end;

  update public.workspaces set plan_id = v_effective_plan where id = v_ws;

  select coalesce((entitlements ->> 'seats')::integer, 1) into v_plan_seats
  from public.plans where id = v_effective_plan;

  update public.workspaces
  set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object(
    'entitlement_overrides',
    (coalesce(settings -> 'entitlement_overrides', '{}'::jsonb) - 'seats')
      || case when v_effective_plan <> 'free' and v_seats > v_plan_seats
              then jsonb_build_object('seats', v_seats) else '{}'::jsonb end
  )
  where id = v_ws;

  -- A newly active paid plan gets its credits without waiting for the cron.
  if v_effective_plan <> 'free' then
    perform public.renew_monthly_credits(v_at, v_ws);
  end if;

  return 'applied';
end;
$$;

revoke all on function public.apply_billing_event(jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Coupon redemption (Plus trial days). Owner/admin only, once per workspace.
-- ---------------------------------------------------------------------------

create or replace function public.redeem_coupon(p_ws uuid, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.coupons;
  v_sub public.subscriptions;
  v_code text := lower(trim(p_code));
  v_ends timestamptz;
begin
  if not public.has_role(p_ws, array['owner', 'admin']) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into v_coupon from public.coupons where code = v_code for update;

  if not found or not v_coupon.is_active
     or (v_coupon.expires_at is not null and v_coupon.expires_at < now())
     or (v_coupon.max_redemptions is not null and v_coupon.redeemed_count >= v_coupon.max_redemptions) then
    raise exception 'coupon_invalid' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.coupon_redemptions where coupon_code = v_code and workspace_id = p_ws) then
    raise exception 'coupon_already_used' using errcode = 'P0001';
  end if;

  if v_coupon.kind = 'trial_days' then
    select * into v_sub from public.subscriptions where workspace_id = p_ws;
    if found and v_sub.status in ('active', 'trialing', 'past_due') then
      raise exception 'trial_not_available' using errcode = 'P0001';
    end if;

    v_ends := now() + make_interval(days => v_coupon.value);

    insert into public.subscriptions (workspace_id, plan_id, provider, status, seats, current_period_end, coupon_code, last_event_at)
    values (p_ws, coalesce(v_coupon.plan_id, 'plus'), 'manual', 'trialing', 1, v_ends, v_code, now())
    on conflict (workspace_id) do update set
      plan_id = excluded.plan_id, provider = 'manual', status = 'trialing', seats = 1,
      current_period_end = excluded.current_period_end, cancel_at_period_end = false,
      coupon_code = excluded.coupon_code, last_event_at = excluded.last_event_at;

    update public.workspaces set plan_id = coalesce(v_coupon.plan_id, 'plus') where id = p_ws;
  end if;

  insert into public.coupon_redemptions (coupon_code, workspace_id, redeemed_by)
  values (v_code, p_ws, (select auth.uid()));
  update public.coupons set redeemed_count = redeemed_count + 1 where code = v_code;

  return jsonb_build_object('kind', v_coupon.kind, 'value', v_coupon.value, 'trial_ends_at', v_ends);
end;
$$;

grant execute on function public.redeem_coupon(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Expiry sweep for trials and period-end cancellations.
-- ---------------------------------------------------------------------------

create or replace function public.expire_subscriptions(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  for v_row in
    select workspace_id from public.subscriptions
    where current_period_end is not null
      and current_period_end < p_now
      and (
        (status = 'trialing' and provider = 'manual')
        or (status in ('active', 'past_due') and cancel_at_period_end)
      )
    for update
  loop
    update public.subscriptions set status = 'canceled' where workspace_id = v_row.workspace_id;
    update public.workspaces set plan_id = 'free' where id = v_row.workspace_id;
    update public.workspaces
    set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object(
      'entitlement_overrides', coalesce(settings -> 'entitlement_overrides', '{}'::jsonb) - 'seats')
    where id = v_row.workspace_id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.expire_subscriptions(timestamptz) from public, anon, authenticated;

select cron.schedule('billing-renew-credits', '5 0 1 * *', $$select public.renew_monthly_credits();$$);
select cron.schedule('billing-expire-subscriptions', '15 * * * *', $$select public.expire_subscriptions();$$);

-- ---------------------------------------------------------------------------
-- Public contact and copyright-notice submissions from the marketing site.
-- Inserted by the server (service role) after validation and rate limiting;
-- no client policy exists, so nothing is readable or writable from a browser.
-- ---------------------------------------------------------------------------

create table public.public_submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('contact', 'copyright')),
  name text not null check (length(name) between 1 and 200),
  email text not null check (length(email) between 3 and 320),
  subject text not null default '' check (length(subject) <= 300),
  body text not null check (length(body) between 1 and 5000),
  content_url text check (content_url is null or length(content_url) <= 2000),
  created_at timestamptz not null default now()
);

alter table public.public_submissions enable row level security;
