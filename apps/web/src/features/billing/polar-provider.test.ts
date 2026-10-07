import { describe, expect, it, vi } from 'vitest';

import { createPolarProvider, signPolarPayload } from './polar-provider';
import { WebhookSignatureError } from './provider';

const WORKSPACE = '11111111-1111-4111-8111-111111111111';
const SECRET = `whsec_${Buffer.from('polar-test-signing-key-0123456789').toString('base64')}`;
const NOW = new Date('2030-01-01T12:00:00.000Z');
const NOW_SEC = String(Math.floor(NOW.getTime() / 1000));
const PRODUCTS = {
  'plus:month': 'prod-plus-month',
  'plus:year': 'prod-plus-year',
  'team:month': 'prod-team-month',
} as const;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

function build(fetchImpl: typeof fetch = vi.fn()) {
  return createPolarProvider({
    accessToken: 'polar_oat_test',
    server: 'sandbox',
    webhookSecret: SECRET,
    products: PRODUCTS,
    fetch: fetchImpl,
    now: () => NOW,
  });
}

function signedHeaders(
  body: string,
  options: { id?: string; timestamp?: string; scheme?: 'standard' | 'legacy' } = {},
) {
  const id = options.id ?? 'msg_1';
  const timestamp = options.timestamp ?? NOW_SEC;
  return new Headers({
    'webhook-id': id,
    'webhook-timestamp': timestamp,
    'webhook-signature': signPolarPayload(SECRET, id, timestamp, body, options.scheme),
  });
}

function subscriptionPayload(
  overrides: Record<string, unknown> = {},
  type = 'subscription.updated',
) {
  return {
    type,
    timestamp: '2030-01-01T11:59:00+00:00',
    data: {
      id: 'sub_1',
      status: 'active',
      product_id: 'prod-plus-year',
      seats: null,
      current_period_end: '2031-01-01T00:00:00+00:00',
      cancel_at_period_end: false,
      customer: { external_id: WORKSPACE },
      ...overrides,
    },
  };
}

describe('polar webhook signature', () => {
  it('accepts a Standard Webhooks signature', async () => {
    const body = JSON.stringify(subscriptionPayload());
    const events = await build().parseWebhook(body, signedHeaders(body));
    expect(events).toHaveLength(1);
  });

  it('accepts a legacy Polar HMAC signature', async () => {
    const body = JSON.stringify(subscriptionPayload());
    const events = await build().parseWebhook(body, signedHeaders(body, { scheme: 'legacy' }));
    expect(events).toHaveLength(1);
  });

  it('rejects a tampered body', async () => {
    const body = JSON.stringify(subscriptionPayload());
    const headers = signedHeaders(body);
    await expect(build().parseWebhook(`${body} `, headers)).rejects.toBeInstanceOf(
      WebhookSignatureError,
    );
  });

  it('rejects missing headers and a wrong secret', async () => {
    const body = JSON.stringify(subscriptionPayload());
    await expect(build().parseWebhook(body, new Headers())).rejects.toBeInstanceOf(
      WebhookSignatureError,
    );
    const forged = new Headers({
      'webhook-id': 'msg_1',
      'webhook-timestamp': NOW_SEC,
      'webhook-signature': signPolarPayload('whsec_b3RoZXI=', 'msg_1', NOW_SEC, body),
    });
    await expect(build().parseWebhook(body, forged)).rejects.toBeInstanceOf(WebhookSignatureError);
  });

  it('rejects a replay older than the tolerance', async () => {
    const body = JSON.stringify(subscriptionPayload());
    const old = String(Number(NOW_SEC) - 3600);
    await expect(
      build().parseWebhook(body, signedHeaders(body, { timestamp: old })),
    ).rejects.toBeInstanceOf(WebhookSignatureError);
  });
});

describe('polar webhook translation', () => {
  async function parse(payload: unknown, id = 'msg_1') {
    const body = JSON.stringify(payload);
    return build().parseWebhook(body, signedHeaders(body, { id }));
  }

  it('maps an active subscription to a neutral update with plan, interval and period', async () => {
    const [event] = await parse(subscriptionPayload(), 'msg_9');
    expect(event).toMatchObject({
      provider: 'polar',
      event_id: 'msg_9',
      workspace_id: WORKSPACE,
      type: 'subscription.updated',
      plan_id: 'plus',
      billing_interval: 'year',
      status: 'active',
      provider_ref: 'sub_1',
      current_period_end: '2031-01-01T00:00:00.000Z',
      cancel_at_period_end: false,
      occurred_at: '2030-01-01T11:59:00.000Z',
    });
  });

  it('keeps a period-end cancellation as an update that is still active', async () => {
    const [event] = await parse(
      subscriptionPayload({ cancel_at_period_end: true }, 'subscription.canceled'),
    );
    expect(event).toMatchObject({
      type: 'subscription.updated',
      status: 'active',
      cancel_at_period_end: true,
    });
  });

  it('maps a revoked subscription to the neutral canceled event', async () => {
    const [event] = await parse(
      subscriptionPayload({ status: 'canceled' }, 'subscription.revoked'),
    );
    expect(event?.type).toBe('subscription.canceled');
  });

  it('maps past_due and unpaid to past_due', async () => {
    const [due] = await parse(subscriptionPayload({ status: 'past_due' }));
    const [unpaid] = await parse(subscriptionPayload({ status: 'unpaid' }));
    expect(due?.status).toBe('past_due');
    expect(unpaid?.status).toBe('past_due');
  });

  it('carries team seats and ignores incomplete subscriptions', async () => {
    const [team] = await parse(subscriptionPayload({ product_id: 'prod-team-month', seats: 7 }));
    expect(team).toMatchObject({ plan_id: 'team', seats: 7, billing_interval: 'month' });
    expect(await parse(subscriptionPayload({ status: 'incomplete' }))).toEqual([]);
  });

  it('leaves the plan unset for an unknown product so the stored plan is kept', async () => {
    const [event] = await parse(subscriptionPayload({ product_id: 'prod-unknown' }));
    expect(event?.plan_id).toBeUndefined();
  });

  it('maps a paid order to an invoice and a refund to a refunded invoice', async () => {
    const order = (type: string) => ({
      type,
      timestamp: '2030-01-01T11:59:00Z',
      data: {
        id: 'order_1',
        total_amount: 14900,
        currency: 'try',
        product_id: 'prod-plus-month',
        customer: { external_id: WORKSPACE },
      },
    });
    const [paid] = await parse(order('order.paid'), 'msg_a');
    const [refunded] = await parse(order('order.refunded'), 'msg_b');
    expect(paid).toMatchObject({
      type: 'payment.succeeded',
      invoice: { id: 'order_1', amount_minor: 14900, currency: 'TRY', status: 'paid' },
    });
    expect(refunded?.invoice?.status).toBe('refunded');
  });

  it('falls back to checkout metadata for the workspace and drops events without one', async () => {
    const [viaMetadata] = await parse(
      subscriptionPayload({ customer: {}, metadata: { workspace_id: WORKSPACE } }),
    );
    expect(viaMetadata?.workspace_id).toBe(WORKSPACE);
    expect(await parse(subscriptionPayload({ customer: {} }))).toEqual([]);
    expect(await parse(subscriptionPayload({ customer: { external_id: 'not-a-uuid' } }))).toEqual(
      [],
    );
  });

  it('ignores event types it does not use', async () => {
    expect(await parse({ type: 'customer.created', data: { id: 'c1' } })).toEqual([]);
  });
});

describe('polar api calls', () => {
  const context = {
    workspaceId: WORKSPACE,
    workspaceName: 'Okul',
    customerEmail: 'ogretmen@example.test',
    returnUrl: 'https://testcim.test/billing?done=1',
  };

  const snapshot = {
    workspaceId: WORKSPACE,
    providerRef: 'sub_1',
    planId: 'plus' as const,
    interval: 'month' as const,
    seats: 1,
    currentPeriodEnd: null,
  };

  it('creates a hosted checkout for the workspace on the sandbox host', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ url: 'https://sandbox.polar.sh/c/abc' }));
    const provider = build(fetchMock);

    const result = await provider.createCheckout({
      ...context,
      request: { planId: 'plus', interval: 'year', seats: 1 },
    });

    expect(result.url).toBe('https://sandbox.polar.sh/c/abc');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://sandbox-api.polar.sh/v1/checkouts/');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer polar_oat_test');
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      products: ['prod-plus-year'],
      external_customer_id: WORKSPACE,
      success_url: context.returnUrl,
    });
    expect(body).not.toHaveProperty('seats');
  });

  it('sends seats only for the team plan', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ url: 'https://sandbox.polar.sh/c/t' }));
    await build(fetchMock).createCheckout({
      ...context,
      request: { planId: 'team', interval: 'month', seats: 5 },
    });
    const init = (fetchMock.mock.calls[0] as [string, RequestInit])[1];
    expect((JSON.parse(init.body as string) as { seats: number }).seats).toBe(5);
  });

  it('fails clearly when a product id is not configured', async () => {
    await expect(
      build().createCheckout({
        ...context,
        request: { planId: 'pro', interval: 'month', seats: 1 },
      }),
    ).rejects.toThrow('polar_product_not_configured_pro_month');
  });

  it('cancels, resumes and changes plan through the subscription endpoint', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({})));
    const provider = build(fetchMock);

    await provider.cancel(snapshot);
    await provider.resume(snapshot);
    await provider.changePlan(snapshot, { planId: 'team', interval: 'month', seats: 4 });

    const calls = fetchMock.mock.calls as [string, RequestInit][];
    expect(calls.map(([url, init]) => `${init.method} ${url}`)).toEqual([
      'PATCH https://sandbox-api.polar.sh/v1/subscriptions/sub_1',
      'PATCH https://sandbox-api.polar.sh/v1/subscriptions/sub_1',
      'PATCH https://sandbox-api.polar.sh/v1/subscriptions/sub_1',
    ]);
    const bodies = calls.map(([, init]) => JSON.parse(init.body as string) as unknown);
    expect(bodies[0]).toEqual({ cancel_at_period_end: true });
    expect(bodies[1]).toEqual({ cancel_at_period_end: false });
    expect(bodies[2]).toMatchObject({ product_id: 'prod-team-month', seats: 4 });
  });

  it('refuses to mutate without a stored subscription and surfaces API failures', async () => {
    await expect(build().cancel({ ...snapshot, providerRef: null })).rejects.toThrow(
      'polar_subscription_missing',
    );

    const failing = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse({ detail: 'x' }, 422)));
    await expect(build(failing as unknown as typeof fetch).cancel(snapshot)).rejects.toThrow(
      'polar_api_error_422',
    );
  });
});
