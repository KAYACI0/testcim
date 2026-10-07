import { createHmac, timingSafeEqual } from 'node:crypto';

import {
  billingEventSchema,
  type BillingEvent,
  type BillingInterval,
  type PaidPlanId,
} from '@testcim/shared';

import {
  WebhookSignatureError,
  type BillingProvider,
  type CheckoutContext,
  type SubscriptionSnapshot,
} from './provider';

const API_HOSTS = {
  sandbox: 'https://sandbox-api.polar.sh',
  production: 'https://api.polar.sh',
} as const;

/** Standard Webhooks allows a few minutes of clock skew; older deliveries are replays. */
const TIMESTAMP_TOLERANCE_SEC = 300;

export type PolarProductKey = `${PaidPlanId}:${BillingInterval}`;

export interface PolarProviderOptions {
  readonly accessToken: string;
  readonly server: keyof typeof API_HOSTS;
  /** The endpoint's `whsec_...` secret from the Polar dashboard. */
  readonly webhookSecret: string;
  /** Polar products have a fixed billing period, so each plan and interval is its own product. */
  readonly products: Partial<Record<PolarProductKey, string | undefined>>;
  readonly fetch?: typeof fetch;
  readonly now?: () => Date;
}

export function productKey(planId: PaidPlanId, interval: BillingInterval): PolarProductKey {
  return `${planId}:${interval}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function toIso(value: unknown): string | undefined {
  const text = str(value);
  if (!text) return undefined;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

/**
 * Candidate HMAC keys for a `whsec_...` secret. Secrets created on or after
 * 2026-09-08 use Standard Webhooks (the key is the base64-decoded part after
 * the prefix); older ones use Polar HMAC (the key is the UTF-8 bytes of the
 * whole string). Polar's SDKs try both, and so does this.
 */
function signingKeys(secret: string): Buffer[] {
  const standard = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const legacy = Buffer.from(secret, 'utf8');
  return [standard, legacy].filter((key) => key.length > 0);
}

function signatureMatches(candidates: readonly Buffer[], signature: string): boolean {
  const received = Buffer.from(signature, 'base64');
  return candidates.some((expected) => {
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

export function signPolarPayload(
  secret: string,
  id: string,
  timestamp: string,
  rawBody: string,
  scheme: 'standard' | 'legacy' = 'standard',
): string {
  const key = scheme === 'standard' ? signingKeys(secret)[0] : Buffer.from(secret, 'utf8');
  if (!key) throw new Error('empty_webhook_secret');
  const digest = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest('base64');
  return `v1,${digest}`;
}

function verifySignature(
  secret: string,
  headers: Headers,
  rawBody: string,
  now: Date,
): { id: string; timestamp: string } {
  const id = headers.get('webhook-id');
  const timestamp = headers.get('webhook-timestamp');
  const header = headers.get('webhook-signature');
  if (!id || !timestamp || !header) {
    throw new WebhookSignatureError();
  }

  const sentAt = Number(timestamp);
  if (
    !Number.isFinite(sentAt) ||
    Math.abs(now.getTime() / 1000 - sentAt) > TIMESTAMP_TOLERANCE_SEC
  ) {
    throw new WebhookSignatureError();
  }

  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const candidates = signingKeys(secret).map((key) =>
    createHmac('sha256', key).update(signedContent).digest(),
  );

  // The header carries one or more space separated `v1,<base64>` entries.
  const valid = header.split(' ').some((entry) => {
    const [version, signature] = entry.split(',');
    return version === 'v1' && signature !== undefined && signatureMatches(candidates, signature);
  });
  if (!valid) {
    throw new WebhookSignatureError();
  }

  return { id, timestamp };
}

function planFromProduct(
  products: PolarProviderOptions['products'],
  productId: string | undefined,
): { planId: PaidPlanId; interval: BillingInterval } | undefined {
  if (!productId) return undefined;
  for (const [key, id] of Object.entries(products)) {
    if (id === productId) {
      const [planId, interval] = key.split(':') as [PaidPlanId, BillingInterval];
      return { planId, interval };
    }
  }
  return undefined;
}

function workspaceIdOf(data: Record<string, unknown>): string | undefined {
  const customer = isRecord(data.customer) ? data.customer : undefined;
  const metadata = isRecord(data.metadata) ? data.metadata : undefined;
  const subscription = isRecord(data.subscription) ? data.subscription : undefined;
  const subscriptionCustomer =
    subscription && isRecord(subscription.customer) ? subscription.customer : undefined;

  return (
    str(customer?.external_id) ??
    str(metadata?.workspace_id) ??
    str(subscriptionCustomer?.external_id)
  );
}

function mapSubscriptionStatus(
  status: string | undefined,
): BillingEvent['status'] | 'ended' | null {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'ended';
    // incomplete (checkout not paid yet) and paused (not offered) change nothing.
    default:
      return null;
  }
}

/**
 * Translates one verified Polar delivery into neutral events. Polar's own
 * `subscription.canceled` means "cancels at period end", so it stays an
 * update; only `subscription.revoked` (the subscription really ended) maps to
 * the neutral `subscription.canceled`, which drops the workspace to free.
 */
function translate(
  envelope: Record<string, unknown>,
  eventId: string,
  fallbackTime: string,
  products: PolarProviderOptions['products'],
): BillingEvent[] {
  const type = str(envelope.type);
  const data = isRecord(envelope.data) ? envelope.data : undefined;
  if (!type || !data) return [];

  const workspaceId = workspaceIdOf(data);
  if (!workspaceId) return [];

  const occurredAt = toIso(envelope.timestamp) ?? fallbackTime;
  const base = { provider: 'polar', event_id: eventId, workspace_id: workspaceId };

  if (type.startsWith('subscription.')) {
    const productId =
      str(data.product_id) ?? (isRecord(data.product) ? str(data.product.id) : undefined);
    const mapped = planFromProduct(products, productId);
    const status = mapSubscriptionStatus(str(data.status));
    const revoked = type === 'subscription.revoked' || status === 'ended';

    if (!revoked && status === null) return [];

    const seats = typeof data.seats === 'number' && data.seats >= 1 ? data.seats : undefined;
    const candidate = {
      ...base,
      type: revoked ? ('subscription.canceled' as const) : ('subscription.updated' as const),
      occurred_at: occurredAt,
      plan_id: mapped?.planId,
      billing_interval: mapped?.interval,
      status: revoked ? undefined : (status as BillingEvent['status']),
      seats,
      provider_ref: str(data.id),
      current_period_end: toIso(data.current_period_end),
      cancel_at_period_end:
        typeof data.cancel_at_period_end === 'boolean' ? data.cancel_at_period_end : undefined,
    };
    const parsed = billingEventSchema.safeParse(candidate);
    return parsed.success ? [parsed.data] : [];
  }

  if (type === 'order.paid' || type === 'order.refunded') {
    const orderId = str(data.id);
    const total = data.total_amount;
    const currency = str(data.currency);
    if (!orderId || typeof total !== 'number' || !currency) return [];

    const subscription = isRecord(data.subscription) ? data.subscription : undefined;
    const productId =
      str(data.product_id) ?? (subscription ? str(subscription.product_id) : undefined);
    const mapped = planFromProduct(products, productId);

    // The neutral event set has no refund type; the invoice status carries it
    // and a payment-only event never changes subscription state.
    const candidate = {
      ...base,
      type: 'payment.succeeded' as const,
      occurred_at: occurredAt,
      plan_id: mapped?.planId,
      invoice: {
        id: orderId,
        amount_minor: Math.max(0, Math.round(total)),
        currency: currency.toUpperCase(),
        status: type === 'order.refunded' ? ('refunded' as const) : ('paid' as const),
      },
    };
    const parsed = billingEventSchema.safeParse(candidate);
    return parsed.success ? [parsed.data] : [];
  }

  return [];
}

/**
 * Polar (Merchant of Record) adapter, sandbox first (docs/adr/0009). Checkout
 * is always Polar's hosted page; subscription state changes only through the
 * verified webhook. The customer is the workspace (`external_customer_id`), so
 * every webhook names its workspace without a lookup table.
 */
export function createPolarProvider(options: PolarProviderOptions): BillingProvider {
  const doFetch = options.fetch ?? fetch;
  const now = options.now ?? (() => new Date());
  const baseUrl = API_HOSTS[options.server];

  async function call(method: 'POST' | 'PATCH', path: string, body: unknown): Promise<unknown> {
    const response = await doFetch(`${baseUrl}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${options.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      // The status is enough to act on; the body may echo customer data.
      throw new Error(`polar_api_error_${response.status}`);
    }
    return (await response.json()) as unknown;
  }

  function productFor(planId: PaidPlanId, interval: BillingInterval): string {
    const id = options.products[productKey(planId, interval)];
    if (!id) {
      throw new Error(`polar_product_not_configured_${planId}_${interval}`);
    }
    return id;
  }

  function requireRef(subscription: SubscriptionSnapshot): string {
    if (!subscription.providerRef) {
      throw new Error('polar_subscription_missing');
    }
    return subscription.providerRef;
  }

  return {
    id: 'polar',

    async createCheckout(context: CheckoutContext) {
      const { planId, interval, seats, couponCode } = context.request;
      const body = {
        products: [productFor(planId, interval)],
        external_customer_id: context.workspaceId,
        customer_email: context.customerEmail,
        customer_name: context.workspaceName,
        success_url: context.returnUrl,
        // Only the team product is seat based; Polar rejects seats on the others.
        ...(planId === 'team' ? { seats } : {}),
        allow_discount_codes: true,
        metadata: {
          workspace_id: context.workspaceId,
          plan_id: planId,
          interval,
          ...(couponCode ? { coupon_code: couponCode } : {}),
        },
      };
      const result = await call('POST', '/v1/checkouts/', body);
      const url = isRecord(result) ? str(result.url) : undefined;
      if (!url) {
        throw new Error('polar_checkout_url_missing');
      }
      return { url };
    },

    async cancel(subscription) {
      await call('PATCH', `/v1/subscriptions/${requireRef(subscription)}`, {
        cancel_at_period_end: true,
      });
    },

    async resume(subscription) {
      await call('PATCH', `/v1/subscriptions/${requireRef(subscription)}`, {
        cancel_at_period_end: false,
      });
    },

    async changePlan(subscription, next) {
      await call('PATCH', `/v1/subscriptions/${requireRef(subscription)}`, {
        product_id: productFor(next.planId, next.interval),
        ...(next.planId === 'team' ? { seats: next.seats } : {}),
        proration_behavior: 'prorate',
      });
    },

    // eslint-disable-next-line @typescript-eslint/require-await
    async parseWebhook(rawBody, headers) {
      const at = now();
      const { id } = verifySignature(options.webhookSecret, headers, rawBody, at);

      let json: unknown;
      try {
        json = JSON.parse(rawBody);
      } catch {
        return [];
      }
      if (!isRecord(json)) return [];

      return translate(json, id, at.toISOString(), options.products);
    },
  };
}
