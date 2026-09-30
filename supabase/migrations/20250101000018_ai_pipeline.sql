-- AI pipeline RPCs (Prompt 11, infrastructure slice): credit refunds and
-- ai_jobs bookkeeping. Mirrors the spend_credits / apply_test_ops pattern
-- used elsewhere: RLS on the underlying tables stays select-only for
-- clients, every mutation goes through a security-definer RPC that checks
-- membership itself.

create or replace function public.refund_credits(
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

  insert into public.credit_ledger (workspace_id, user_id, delta, reason, ref_type, ref_id)
  values (p_ws, (select auth.uid()), p_amount, p_reason, p_ref_type, p_ref_id);

  select coalesce(sum(delta), 0) into v_balance
  from public.credit_ledger
  where workspace_id = p_ws;

  return v_balance;
end;
$$;

-- Inserts a running ai_jobs row for the calling user and returns its id.
-- The caller (server-side AI pipeline) fills in output/model/tokens/cost
-- via complete_ai_job or fail_ai_job once the provider call resolves.
create or replace function public.create_ai_job(p_ws uuid, p_kind text, p_input jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.has_role(p_ws, array['owner', 'admin', 'editor']) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  insert into public.ai_jobs (workspace_id, user_id, kind, input, status)
  values (p_ws, (select auth.uid()), p_kind, p_input, 'running')
  returning id into v_id;

  return v_id;
end;
$$;

-- Authorizes a mutation against an existing ai_jobs row: the caller must
-- hold an editor-or-above role in that job's own workspace. Shared by
-- complete_ai_job and fail_ai_job so a workspace can't complete or fail a
-- job that belongs to a different tenant.
create or replace function public.require_ai_job_access(p_job_id uuid)
returns public.ai_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.ai_jobs;
begin
  select * into v_job from public.ai_jobs where id = p_job_id;

  if v_job.id is null then
    raise exception 'ai_job_not_found';
  end if;

  if not public.has_role(v_job.workspace_id, array['owner', 'admin', 'editor']) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return v_job;
end;
$$;

create or replace function public.complete_ai_job(
  p_job_id uuid,
  p_output jsonb,
  p_model text,
  p_tokens_in int,
  p_tokens_out int,
  p_cost_micro bigint,
  p_credits_charged int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_ai_job_access(p_job_id);

  update public.ai_jobs
  set status = 'succeeded',
      output = p_output,
      model = p_model,
      tokens_in = p_tokens_in,
      tokens_out = p_tokens_out,
      cost_micro = p_cost_micro,
      credits_charged = p_credits_charged
  where id = p_job_id;
end;
$$;

create or replace function public.fail_ai_job(p_job_id uuid, p_error text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.require_ai_job_access(p_job_id);

  update public.ai_jobs
  set status = 'failed',
      error = p_error
  where id = p_job_id;
end;
$$;
