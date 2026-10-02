import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import { billingEventSchema, type BillingEvent, type PaidPlanId } from '@testcim/shared';

import {
  WebhookSignatureError,
  type BillingProvider,
  type CheckoutContext,
  type SubscriptionSnapshot,
} from './provider';

export const FAKE_SIGNATURE_HEADER = 'x-fake-signature';

type EventDraft = Omit<BillingEvent, 'provider' | 'event_id' | 'occurred_at'>;

export function signFakePayload(secret: string, rawBody: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length > 0 && left.length === right.length && timingSafeEqual(left, right);
}

/** Monthly or yearly period length used by the simulated provider. */
export function periodEnd(from: Date, interval: 'month' | 'year'): string {
  const end = new Date(from);
  if (interval === 'year') {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
  } else {
    end.setUTCMonth(end.getUTCMonth() + 1);
  }
  return end.toISOString();
}

export interface FakeProviderOptions {
  readonly secret: string;
  /** Delivers a signed webhook body to the app's own handler. */
  readonly deliver: (rawBody: string, headers: Headers) => Promise<void>;
  readonly siteUrl: string;
  readonly now?: () => Date;
}

/**
 * Local and test stand-in for a real payment provider. Its checkout page is
 * an app route that "pays" by delivering a signed webhook, so the whole flow
 * (checkout, webhook, entitlement change, cancel, resume) runs end to end
 * without an external account. Refused in production by the registry.
 */
export function createFakeProvider(options: FakeProviderOptions): BillingProvider {
  const now = options.now ?? (() => new Date());

  function send(event: EventDraft) {
    return deliverFakeEvent({ ...options, now: now() }, event);
  }

  function baseFor(subscription: SubscriptionSnapshot, planId: PaidPlanId = subscription.planId) {
    return {
      workspace_id: subscription.workspaceId,
      type: 'subscription.updated' as const,
      plan_id: planId,
      provider_ref: subscription.providerRef ?? `fake_${subscription.workspaceId}`,
      seats: subscription.seats,
      billing_interval: subscription.interval,
      current_period_end: subscription.currentPeriodEnd ?? periodEnd(now(), subscription.interval),
    };
  }

  return {
    id: 'fake',

    // eslint-disable-next-line @typescript-eslint/require-await
    async createCheckout(context: CheckoutContext) {
      const url = new URL('/billing/fake-checkout', options.siteUrl);
      url.searchParams.set('workspace', context.workspaceId);
      url.searchParams.set('plan', context.request.planId);
      url.searchParams.set('interval', context.request.interval);
      url.searchParams.set('seats', String(context.request.seats));
      if (context.request.couponCode) {
        url.searchParams.set('coupon', context.request.couponCode);
      }
      return { url: url.toString() };
    },

    async cancel(subscription) {
      await send({ ...baseFor(subscription), status: 'active', cancel_at_period_end: true });
    },

    async resume(subscription) {
      await send({ ...baseFor(subscription), status: 'active', cancel_at_period_end: false });
    },

    async changePlan(subscription, next) {
      await send({
        ...baseFor(subscription, next.planId),
        status: 'active',
        seats: next.seats,
        billing_interval: next.interval,
        current_period_end: periodEnd(now(), next.interval),
        cancel_at_period_end: false,
      });
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async parseWebhook(rawBody, headers) {
      const signature = headers.get(FAKE_SIGNATURE_HEADER) ?? '';
      if (!safeEqualHex(signature, signFakePayload(options.secret, rawBody))) {
        throw new WebhookSignatureError();
      }
      let json: unknown;
      try {
        json = JSON.parse(rawBody);
      } catch {
        return [];
      }
      const parsed = billingEventSchema.safeParse(json);
      return parsed.success ? [parsed.data] : [];
    },
  };
}

/** The events a completed fake checkout produces: activation plus a paid invoice. */
export function completedCheckoutEvents(input: {
  workspaceId: string;
  planId: PaidPlanId;
  interval: 'month' | 'year';
  seats: number;
  amountMinor: number;
  currency: string;
  couponCode?: string;
  now: Date;
}): EventDraft[] {
  const end = periodEnd(input.now, input.interval);

  return [
    {
      workspace_id: input.workspaceId,
      type: 'subscription.updated',
      plan_id: input.planId,
      status: 'active',
      seats: input.seats,
      provider_ref: `fake_${input.workspaceId}`,
      billing_interval: input.interval,
      current_period_end: end,
      cancel_at_period_end: false,
      coupon_code: input.couponCode,
    },
    {
      workspace_id: input.workspaceId,
      type: 'payment.succeeded',
      plan_id: input.planId,
      invoice: {
        id: `inv_${randomUUID()}`,
        amount_minor: input.amountMinor,
        currency: input.currency,
        status: 'paid',
        period_start: input.now.toISOString(),
        period_end: end,
      },
    },
  ];
}

/** Signs and delivers one draft event (used by the fake checkout page). */
export async function deliverFakeEvent(
  options: Pick<FakeProviderOptions, 'secret' | 'deliver'> & { now: Date },
  draft: EventDraft,
): Promise<void> {
  const body = billingEventSchema.parse({
    ...draft,
    provider: 'fake',
    event_id: `evt_${randomUUID()}`,
    occurred_at: options.now.toISOString(),
  });
  const rawBody = JSON.stringify(body);
  await options.deliver(
    rawBody,
    new Headers({ [FAKE_SIGNATURE_HEADER]: signFakePayload(options.secret, rawBody) }),
  );
}
