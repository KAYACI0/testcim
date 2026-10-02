import 'server-only';

import type { BillingProvider } from './provider';

import { createAdminClient } from '@/lib/supabase/admin';

export type WebhookResult = 'applied' | 'duplicate' | 'stale' | 'ignored';

/**
 * Verifies and applies one webhook delivery. Safe to replay: the database
 * rejects a repeated (provider, event_id) and ignores events older than the
 * subscription's latest applied event. Database failures are thrown so the
 * provider retries the delivery.
 */
export async function handleWebhook(
  provider: BillingProvider,
  rawBody: string,
  headers: Headers,
): Promise<WebhookResult[]> {
  const events = await provider.parseWebhook(rawBody, headers);
  const admin = createAdminClient();
  const results: WebhookResult[] = [];

  for (const event of events) {
    const { data, error } = await admin.rpc('apply_billing_event', { p_event: { ...event } });

    if (error) {
      // 23503: the workspace no longer exists. Retrying can never succeed.
      if (error.code === '23503') {
        results.push('ignored');
        continue;
      }
      throw error;
    }

    results.push(data === 'duplicate' || data === 'stale' ? data : 'applied');
  }

  return results;
}
