'use server';

import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';

import { checkoutRequestSchema } from '@testcim/shared';

import { completedCheckoutEvents, deliverFakeEvent } from './fake-provider';
import { priceFor } from './prices.server';
import { fakeBillingSecret, getBillingProvider, isFakeBilling } from './registry.server';
import { handleWebhook } from './webhook.server';

import { requireSession } from '@/lib/auth/dal';
import { requireRole } from '@/lib/workspace/entitlements.server';

/** Completes the simulated payment by delivering signed webhooks, like a real provider would. */
export async function completeFakeCheckout(formData: FormData): Promise<void> {
  if (!isFakeBilling()) {
    notFound();
  }

  await requireSession();
  const workspaceId = z.uuid().parse(formData.get('workspaceId'));
  const request = checkoutRequestSchema.parse({
    planId: formData.get('planId'),
    interval: formData.get('interval'),
    couponCode: formData.get('couponCode') || undefined,
  });

  await requireRole(workspaceId, ['owner', 'admin']);

  const price = await priceFor(request.planId, request.interval);
  const provider = getBillingProvider();
  if (!price || !provider) {
    notFound();
  }

  const now = new Date();
  const drafts = completedCheckoutEvents({
    workspaceId,
    planId: request.planId,
    interval: request.interval,
    seats: request.seats,
    amountMinor: price.amountMinor,
    currency: price.currency,
    ...(request.couponCode ? { couponCode: request.couponCode } : {}),
    now,
  });

  for (const draft of drafts) {
    await deliverFakeEvent(
      {
        secret: fakeBillingSecret(),
        now,
        deliver: async (rawBody, headers) => {
          await handleWebhook(provider, rawBody, headers);
        },
      },
      draft,
    );
  }

  redirect('/settings/billing');
}
