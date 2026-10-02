import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { clientEnv } from '@/lib/env.client';

export interface PublicPlan {
  readonly id: string;
  readonly name: string;
  readonly entitlements: Record<string, unknown>;
  readonly priceMonthlyMinor: number | null;
  readonly priceYearlyMinor: number | null;
  readonly currency: string;
}

/**
 * Plans for the public pricing page, read with the anonymous key (the plans
 * table is world-readable by policy) and no cookies, so pages that call this
 * stay statically renderable. Returns an empty list if the database is
 * unreachable; the page then says so instead of failing the build.
 */
export async function getPublicPlans(): Promise<PublicPlan[]> {
  try {
    const client = createClient(
      clientEnv.NEXT_PUBLIC_SUPABASE_URL,
      clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await client
      .from('plans')
      .select('id, name, entitlements, price_monthly_minor, price_yearly_minor, currency')
      .eq('is_active', true)
      .order('sort_order');

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      entitlements: (row.entitlements ?? {}) as Record<string, unknown>,
      priceMonthlyMinor: row.price_monthly_minor as number | null,
      priceYearlyMinor: row.price_yearly_minor as number | null,
      currency: row.currency as string,
    }));
  } catch {
    return [];
  }
}
