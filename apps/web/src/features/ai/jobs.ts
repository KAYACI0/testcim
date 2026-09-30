import 'server-only';

import type { AiJobKind } from '@testcim/shared';

import type { createClient } from '@/lib/supabase/server';

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface AiJobCompletion {
  readonly output: unknown;
  readonly model: string;
  readonly tokensIn: number;
  readonly tokensOut: number;
  readonly costMicro: number;
  readonly creditsCharged: number;
}

/** Wraps `create_ai_job`; returns the new `ai_jobs.id`. */
export async function createAiJob(
  supabase: Supabase,
  workspaceId: string,
  kind: AiJobKind,
  input: unknown,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_ai_job', {
    p_ws: workspaceId,
    p_kind: kind,
    p_input: input ?? {},
  });

  if (error || !data) {
    throw error ?? new Error('create_ai_job_failed');
  }

  return data;
}

/** Wraps `complete_ai_job`. */
export async function completeAiJob(
  supabase: Supabase,
  jobId: string,
  result: AiJobCompletion,
): Promise<void> {
  const { error } = await supabase.rpc('complete_ai_job', {
    p_job_id: jobId,
    p_output: result.output,
    p_model: result.model,
    p_tokens_in: result.tokensIn,
    p_tokens_out: result.tokensOut,
    p_cost_micro: result.costMicro,
    p_credits_charged: result.creditsCharged,
  });

  if (error) {
    throw error;
  }
}

/** Wraps `fail_ai_job`. */
export async function failAiJob(
  supabase: Supabase,
  jobId: string,
  errorMessage: string,
): Promise<void> {
  const { error } = await supabase.rpc('fail_ai_job', { p_job_id: jobId, p_error: errorMessage });

  if (error) {
    throw error;
  }
}
