import { describe, expect, it } from 'vitest';

import {
  FAKE_SIGNATURE_HEADER,
  completedCheckoutEvents,
  createFakeProvider,
  signFakePayload,
} from './fake-provider';
import { WebhookSignatureError, type SubscriptionSnapshot } from './provider';

const SECRET = 'test-secret-1234567890';
const WORKSPACE = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2030-01-15T10:00:00.000Z');

const snapshot: SubscriptionSnapshot = {
  workspaceId: WORKSPACE,
  providerRef: 'fake_ref',
  planId: 'plus',
  interval: 'month',
  seats: 1,
  currentPeriodEnd: '2030-02-15T10:00:00.000Z',
};

function setup() {
  const delivered: { body: string; headers: Headers }[] = [];
  const provider = createFakeProvider({
    secret: SECRET,
    siteUrl: 'http://localhost:3000',
    now: () => NOW,
    deliver: (body, headers) => {
      delivered.push({ body, headers });
      return Promise.resolve();
    },
  });
  return { provider, delivered };
}

describe('fake provider webhook signature', () => {
  it('accepts a correctly signed body and rejects a tampered one', async () => {
    const { provider, delivered } = setup();
    await provider.cancel(snapshot);
    const { body, headers } = delivered[0]!;

    await expect(provider.parseWebhook(body, headers)).resolves.toHaveLength(1);

    const tampered = body.replace('"plus"', '"team"');
    await expect(provider.parseWebhook(tampered, headers)).rejects.toBeInstanceOf(
      WebhookSignatureError,
    );
  });

  it('rejects a missing or malformed signature', async () => {
    const { provider } = setup();
    const body = JSON.stringify({ any: 'thing' });

    await expect(provider.parseWebhook(body, new Headers())).rejects.toBeInstanceOf(
      WebhookSignatureError,
    );
    await expect(
      provider.parseWebhook(body, new Headers({ [FAKE_SIGNATURE_HEADER]: 'zz' })),
    ).rejects.toBeInstanceOf(WebhookSignatureError);
  });

  it('rejects a signature made with another secret', async () => {
    const { provider } = setup();
    const body = JSON.stringify({ any: 'thing' });
    const headers = new Headers({
      [FAKE_SIGNATURE_HEADER]: signFakePayload('other-secret-0000000', body),
    });

    await expect(provider.parseWebhook(body, headers)).rejects.toBeInstanceOf(
      WebhookSignatureError,
    );
  });

  it('drops a validly signed body that is not a billing event', async () => {
    const { provider } = setup();
    const body = JSON.stringify({ hello: 'world' });
    const headers = new Headers({ [FAKE_SIGNATURE_HEADER]: signFakePayload(SECRET, body) });

    await expect(provider.parseWebhook(body, headers)).resolves.toEqual([]);
  });
});

describe('fake provider mutations', () => {
  it('cancel schedules a period-end cancellation and keeps the subscription active', async () => {
    const { provider, delivered } = setup();
    await provider.cancel(snapshot);
    const [event] = await provider.parseWebhook(delivered[0]!.body, delivered[0]!.headers);

    expect(event).toMatchObject({
      type: 'subscription.updated',
      status: 'active',
      cancel_at_period_end: true,
      plan_id: 'plus',
      workspace_id: WORKSPACE,
    });
  });

  it('resume clears the scheduled cancellation', async () => {
    const { provider, delivered } = setup();
    await provider.resume({ ...snapshot });
    const [event] = await provider.parseWebhook(delivered[0]!.body, delivered[0]!.headers);

    expect(event?.cancel_at_period_end).toBe(false);
  });

  it('changePlan carries the new plan, interval and a fresh period', async () => {
    const { provider, delivered } = setup();
    await provider.changePlan(snapshot, { planId: 'pro', interval: 'year', seats: 3 });
    const [event] = await provider.parseWebhook(delivered[0]!.body, delivered[0]!.headers);

    expect(event).toMatchObject({ plan_id: 'pro', billing_interval: 'year', seats: 3 });
    expect(event?.current_period_end).toBe('2031-01-15T10:00:00.000Z');
  });

  it('every delivery gets a unique event id so replays are distinguishable from new events', async () => {
    const { provider, delivered } = setup();
    await provider.cancel(snapshot);
    await provider.cancel(snapshot);
    const ids = await Promise.all(
      delivered.map(
        async (entry) => (await provider.parseWebhook(entry.body, entry.headers))[0]?.event_id,
      ),
    );

    expect(new Set(ids).size).toBe(2);
  });

  it('createCheckout points at the fake checkout page with the chosen plan', async () => {
    const { provider } = setup();
    const { url } = await provider.createCheckout({
      workspaceId: WORKSPACE,
      workspaceName: 'WS',
      customerEmail: undefined,
      returnUrl: 'http://localhost:3000/settings/billing',
      request: { planId: 'pro', interval: 'year', seats: 1, couponCode: 'deneme14' },
    });
    const parsed = new URL(url);

    expect(parsed.pathname).toBe('/billing/fake-checkout');
    expect(parsed.searchParams.get('plan')).toBe('pro');
    expect(parsed.searchParams.get('interval')).toBe('year');
    expect(parsed.searchParams.get('coupon')).toBe('deneme14');
  });
});

describe('completedCheckoutEvents', () => {
  it('produces an activation event followed by a paid invoice', () => {
    const events = completedCheckoutEvents({
      workspaceId: WORKSPACE,
      planId: 'plus',
      interval: 'month',
      seats: 1,
      amountMinor: 14900,
      currency: 'TRY',
      now: NOW,
    });

    expect(events.map((event) => event.type)).toEqual([
      'subscription.updated',
      'payment.succeeded',
    ]);
    expect(events[0]).toMatchObject({
      status: 'active',
      current_period_end: '2030-02-15T10:00:00.000Z',
    });
    expect(events[1]?.invoice).toMatchObject({ amount_minor: 14900, status: 'paid' });
  });
});
