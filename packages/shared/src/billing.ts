import { z } from 'zod';

export const PAID_PLAN_IDS = ['plus', 'pro', 'team'] as const;
export type PaidPlanId = (typeof PAID_PLAN_IDS)[number];

export const BILLING_INTERVALS = ['month', 'year'] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const SUBSCRIPTION_STATUSES = ['trialing', 'active', 'past_due', 'canceled'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const invoiceSchema = z.object({
  id: z.string().min(1),
  amount_minor: z.number().int().nonnegative(),
  currency: z.string().length(3).default('TRY'),
  status: z.enum(['paid', 'failed', 'refunded']),
  period_start: z.iso.datetime().optional(),
  period_end: z.iso.datetime().optional(),
  document_url: z.url().optional(),
});

/**
 * Provider-neutral event. Each BillingProvider adapter translates its own
 * webhook payload into this shape; apply_billing_event() consumes it as-is.
 */
export const billingEventSchema = z.object({
  provider: z.string().min(1),
  event_id: z.string().min(1),
  workspace_id: z.uuid(),
  type: z.enum([
    'subscription.updated',
    'subscription.canceled',
    'payment.succeeded',
    'payment.failed',
  ]),
  occurred_at: z.iso.datetime(),
  plan_id: z.enum(['free', ...PAID_PLAN_IDS]).optional(),
  status: z.enum(SUBSCRIPTION_STATUSES).optional(),
  seats: z.number().int().min(1).max(1000).optional(),
  provider_ref: z.string().optional(),
  current_period_end: z.iso.datetime().optional(),
  cancel_at_period_end: z.boolean().optional(),
  billing_interval: z.enum(BILLING_INTERVALS).optional(),
  coupon_code: z.string().optional(),
  invoice: invoiceSchema.optional(),
});
export type BillingEvent = z.infer<typeof billingEventSchema>;

export const checkoutRequestSchema = z.object({
  planId: z.enum(PAID_PLAN_IDS),
  interval: z.enum(BILLING_INTERVALS),
  seats: z.number().int().min(1).max(1000).default(1),
  couponCode: z.string().trim().toLowerCase().min(3).max(40).optional(),
});
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

export const couponCodeSchema = z.string().trim().toLowerCase().min(3).max(40);

export const billingProfileSchema = z.object({
  legalName: z.string().trim().max(200),
  taxOffice: z.string().trim().max(120),
  taxNumber: z
    .string()
    .trim()
    .max(11)
    .regex(/^(\d{10,11})?$/),
  address: z.string().trim().max(500),
  invoiceEmail: z.union([z.literal(''), z.email()]),
});
export type BillingProfileInput = z.infer<typeof billingProfileSchema>;

/** Formats an amount in minor units (kuruş) for display, e.g. 12900 TRY -> "129,00 TL". */
export function formatMinor(amountMinor: number, currency: string, locale = 'tr-TR'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: currency === 'TRY' && locale.startsWith('tr') ? 'narrowSymbol' : 'symbol',
    minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
  }).format(amountMinor / 100);
}

/** Yearly price expressed per month, for the pricing table toggle. */
export function monthlyEquivalentMinor(yearlyMinor: number): number {
  return Math.round(yearlyMinor / 12);
}
