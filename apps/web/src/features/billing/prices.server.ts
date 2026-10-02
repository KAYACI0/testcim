import 'server-only';

import type { BillingInterval, PaidPlanId } from '@testcim/shared';

import { createClient } from '@/lib/supabase/server';

export interface PlanPrice {
  readonly amountMinor: number;
  readonly currency: string;
}

/** The configured price for a plan and interval, or null while it is not priced yet. */
export async function priceFor(
  planId: PaidPlanId,
  interval: BillingInterval,
): Promise<PlanPrice | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('plans')
    .select('price_monthly_minor, price_yearly_minor, currency')
    .eq('id', planId)
    .eq('is_active', true)
    .maybeSingle();

  const amountMinor = interval === 'year' ? data?.price_yearly_minor : data?.price_monthly_minor;

  return data && amountMinor !== null && amountMinor !== undefined
    ? { amountMinor, currency: data.currency }
    : null;
}
