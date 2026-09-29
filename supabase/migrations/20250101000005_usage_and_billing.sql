-- Plan entitlements, usage counters, AI credit ledger, and audit log.
-- All client access is select-only; mutation happens through
-- increment_usage()/spend_credits() (security definer) or a billing webhook
-- running with the service role.

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.workspaces (id) on delete cascade,
  plan_id text not null references public.plans (id),
  provider text not null check (provider in ('iyzico', 'manual')),
  provider_ref text,
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled')),
  seats int not null default 1,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create table public.usage_counters (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  period_start date not null,
  metric text not null,
  value bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, period_start, metric)
);

create trigger set_updated_at
  before update on public.usage_counters
  for each row execute function public.set_updated_at();

-- Append-only ledgers: no updated_at, no update/delete policy for anyone.
create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  delta integer not null,
  reason text not null,
  ref_type text,
  ref_id uuid,
  created_at timestamptz not null default now()
);

create index credit_ledger_workspace_id_created_at_idx
  on public.credit_ledger (workspace_id, created_at desc);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_workspace_id_created_at_idx
  on public.audit_log (workspace_id, created_at desc);

alter table public.subscriptions enable row level security;
alter table public.usage_counters enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.audit_log enable row level security;

create policy "subscriptions_select_members" on public.subscriptions
  for select
  to authenticated
  using (public.is_member(workspace_id));

create policy "usage_counters_select_members" on public.usage_counters
  for select
  to authenticated
  using (public.is_member(workspace_id));

create policy "credit_ledger_select_members" on public.credit_ledger
  for select
  to authenticated
  using (public.is_member(workspace_id));

create policy "audit_log_select_members" on public.audit_log
  for select
  to authenticated
  using (public.is_member(workspace_id));

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

create or replace function public.get_entitlements(p_ws uuid)
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if (select auth.uid()) is not null and not public.is_member(p_ws) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select coalesce(p.entitlements, '{}'::jsonb) || coalesce(w.settings -> 'entitlement_overrides', '{}'::jsonb)
  into v_result
  from public.workspaces w
  join public.plans p on p.id = w.plan_id
  where w.id = p_ws;

  return v_result;
end;
$$;

create or replace function public.increment_usage(p_ws uuid, p_metric text, p_amount bigint default 1)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit numeric;
  v_current bigint;
  v_period date := date_trunc('month', now())::date;
begin
  if not public.has_role(p_ws, array['owner', 'admin', 'editor']) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  select (public.get_entitlements(p_ws) ->> p_metric)::numeric into v_limit;

  insert into public.usage_counters (workspace_id, period_start, metric, value)
  values (p_ws, v_period, p_metric, p_amount)
  on conflict (workspace_id, period_start, metric)
    do update set value = public.usage_counters.value + excluded.value
  returning value into v_current;

  if v_limit is not null and v_limit >= 0 and v_current > v_limit then
    update public.usage_counters
    set value = value - p_amount
    where workspace_id = p_ws and period_start = v_period and metric = p_metric;

    raise exception 'usage_limit_exceeded' using errcode = 'P0001', detail = p_metric;
  end if;

  return v_current;
end;
$$;

create or replace function public.spend_credits(
  p_ws uuid,
  p_amount int,
  p_reason text,
  p_ref_type text default null,
  p_ref_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance bigint;
begin
  if p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  if not public.has_role(p_ws, array['owner', 'admin', 'editor']) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  -- Serialize concurrent spends against the same workspace so the balance
  -- check below can't race with another spend in flight.
  perform pg_advisory_xact_lock(hashtext(p_ws::text));

  select coalesce(sum(delta), 0) into v_balance
  from public.credit_ledger
  where workspace_id = p_ws;

  if v_balance < p_amount then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  insert into public.credit_ledger (workspace_id, user_id, delta, reason, ref_type, ref_id)
  values (p_ws, (select auth.uid()), -p_amount, p_reason, p_ref_type, p_ref_id);

  return v_balance - p_amount;
end;
$$;
