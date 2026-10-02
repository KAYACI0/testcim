import { describe, expect, it } from 'vitest';

import {
  billingEventSchema,
  billingProfileSchema,
  checkoutRequestSchema,
  formatMinor,
  monthlyEquivalentMinor,
} from './billing';

const WORKSPACE = '11111111-1111-4111-8111-111111111111';

describe('billingEventSchema', () => {
  const base = {
    provider: 'fake',
    event_id: 'evt_1',
    workspace_id: WORKSPACE,
    type: 'subscription.updated',
    occurred_at: '2030-01-01T00:00:00.000Z',
  };

  it('accepts a minimal event and an event with an invoice', () => {
    expect(billingEventSchema.safeParse(base).success).toBe(true);
    expect(
      billingEventSchema.safeParse({
        ...base,
        type: 'payment.succeeded',
        invoice: { id: 'inv_1', amount_minor: 100, status: 'paid' },
      }).success,
    ).toBe(true);
  });

  it('rejects unknown plans, statuses, event types and bad seat counts', () => {
    expect(billingEventSchema.safeParse({ ...base, plan_id: 'gold' }).success).toBe(false);
    expect(billingEventSchema.safeParse({ ...base, status: 'paused' }).success).toBe(false);
    expect(billingEventSchema.safeParse({ ...base, type: 'refund.issued' }).success).toBe(false);
    expect(billingEventSchema.safeParse({ ...base, seats: 0 }).success).toBe(false);
    expect(billingEventSchema.safeParse({ ...base, workspace_id: 'nope' }).success).toBe(false);
  });
});

describe('checkoutRequestSchema', () => {
  it('normalizes the coupon code and defaults to one seat', () => {
    const parsed = checkoutRequestSchema.parse({
      planId: 'plus',
      interval: 'month',
      couponCode: '  DENEME14 ',
    });

    expect(parsed.couponCode).toBe('deneme14');
    expect(parsed.seats).toBe(1);
  });

  it('refuses the free plan as a checkout target', () => {
    expect(checkoutRequestSchema.safeParse({ planId: 'free', interval: 'month' }).success).toBe(
      false,
    );
  });
});

describe('billingProfileSchema', () => {
  const valid = {
    legalName: 'Örnek Ltd',
    taxOffice: 'Kadıköy',
    taxNumber: '1234567890',
    address: '',
    invoiceEmail: '',
  };

  it('accepts 10 or 11 digit tax numbers and an empty one', () => {
    expect(billingProfileSchema.safeParse(valid).success).toBe(true);
    expect(billingProfileSchema.safeParse({ ...valid, taxNumber: '12345678901' }).success).toBe(
      true,
    );
    expect(billingProfileSchema.safeParse({ ...valid, taxNumber: '' }).success).toBe(true);
  });

  it('rejects malformed tax numbers and emails', () => {
    expect(billingProfileSchema.safeParse({ ...valid, taxNumber: '12345' }).success).toBe(false);
    expect(billingProfileSchema.safeParse({ ...valid, taxNumber: 'abcdefghij' }).success).toBe(
      false,
    );
    expect(billingProfileSchema.safeParse({ ...valid, invoiceEmail: 'not-an-email' }).success).toBe(
      false,
    );
  });
});

describe('price helpers', () => {
  it('formats minor units as Turkish lira', () => {
    expect(formatMinor(14900, 'TRY')).toContain('149');
    expect(formatMinor(14950, 'TRY')).toContain('149,50');
  });

  it('computes the monthly equivalent of a yearly price', () => {
    expect(monthlyEquivalentMinor(120000)).toBe(10000);
    expect(monthlyEquivalentMinor(100)).toBe(8);
  });
});
