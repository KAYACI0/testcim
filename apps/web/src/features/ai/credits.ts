import 'server-only';

import { InsufficientCreditsError } from './errors';

import type { createClient } from '@/lib/supabase/server';

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Wraps `spend_credits`; throws `InsufficientCreditsError` on an insufficient balance. */
export async function spendAiCredits(
  supabase: Supabase,
  workspaceId: string,
  amount: number,
  jobId: string,
): Promise<void> {
  const { error } = await supabase.rpc('spend_credits', {
    p_ws: workspaceId,
    p_amount: amount,
    p_reason: 'ai_job',
    p_ref_type: 'ai_job',
    p_ref_id: jobId,
  });

  if (error) {
    if (error.message.includes('insufficient_credits')) {
      throw new InsufficientCreditsError();
    }

    throw error;
  }
}

/** Wraps `refund_credits`, used when a spent job then fails or gets rate-limited. */
export async function refundAiCredits(
  supabase: Supabase,
  workspaceId: string,
  amount: number,
  jobId: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc('refund_credits', {
    p_ws: workspaceId,
    p_amount: amount,
    p_reason: reason,
    p_ref_type: 'ai_job',
    p_ref_id: jobId,
  });

  if (error) {
    throw error;
  }
}
