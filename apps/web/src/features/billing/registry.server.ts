import 'server-only';

import { createFakeProvider } from './fake-provider';
import { createPolarProvider } from './polar-provider';
import { handleWebhook } from './webhook.server';

import type { BillingProvider } from './provider';

import { clientEnv } from '@/lib/env.client';
import { serverEnv } from '@/lib/env.server';

let cached: BillingProvider | null | undefined;

/**
 * The configured provider, or null when billing is switched off
 * (`BILLING_PROVIDER=none`). The fake provider is refused in production so a
 * misconfigured deploy can never hand out paid plans for free.
 */
export function getBillingProvider(): BillingProvider | null {
  if (cached !== undefined) {
    return cached;
  }

  const choice = serverEnv.BILLING_PROVIDER;

  if (choice === 'none') {
    cached = null;
    return cached;
  }

  const secret = serverEnv.BILLING_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('BILLING_WEBHOOK_SECRET is required when a billing provider is enabled');
  }

  if (choice === 'fake') {
    if (serverEnv.NODE_ENV === 'production') {
      throw new Error('BILLING_PROVIDER=fake is not allowed in production');
    }

    const provider: BillingProvider = createFakeProvider({
      secret,
      siteUrl: clientEnv.NEXT_PUBLIC_SITE_URL,
      deliver: async (rawBody, headers) => {
        await handleWebhook(provider, rawBody, headers);
      },
    });
    cached = provider;
    return cached;
  }

  if (choice === 'polar') {
    if (!serverEnv.POLAR_ACCESS_TOKEN) {
      throw new Error('POLAR_ACCESS_TOKEN is required when BILLING_PROVIDER=polar');
    }

    cached = createPolarProvider({
      accessToken: serverEnv.POLAR_ACCESS_TOKEN,
      server: serverEnv.POLAR_SERVER,
      webhookSecret: secret,
      products: {
        'plus:month': serverEnv.POLAR_PRODUCT_PLUS_MONTH,
        'plus:year': serverEnv.POLAR_PRODUCT_PLUS_YEAR,
        'pro:month': serverEnv.POLAR_PRODUCT_PRO_MONTH,
        'pro:year': serverEnv.POLAR_PRODUCT_PRO_YEAR,
        'team:month': serverEnv.POLAR_PRODUCT_TEAM_MONTH,
        'team:year': serverEnv.POLAR_PRODUCT_TEAM_YEAR,
      },
    });
    return cached;
  }

  throw new Error(`Billing provider "${choice}" has no adapter yet`);
}

export function isFakeBilling(): boolean {
  return serverEnv.BILLING_PROVIDER === 'fake' && serverEnv.NODE_ENV !== 'production';
}

export function fakeBillingSecret(): string {
  const secret = serverEnv.BILLING_WEBHOOK_SECRET;
  if (!isFakeBilling() || !secret) {
    throw new Error('fake billing is not enabled');
  }
  return secret;
}
