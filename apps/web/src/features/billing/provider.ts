import type { BillingEvent, BillingInterval, CheckoutRequest, PaidPlanId } from '@testcim/shared';

/** What the app knows about the current subscription when it calls a provider. */
export interface SubscriptionSnapshot {
  readonly workspaceId: string;
  readonly providerRef: string | null;
  readonly planId: PaidPlanId;
  readonly interval: BillingInterval;
  readonly seats: number;
  readonly currentPeriodEnd: string | null;
}

export interface CheckoutContext {
  readonly workspaceId: string;
  readonly workspaceName: string;
  readonly customerEmail: string | undefined;
  readonly request: CheckoutRequest;
  readonly returnUrl: string;
}

export class WebhookSignatureError extends Error {
  constructor() {
    super('invalid_webhook_signature');
    this.name = 'WebhookSignatureError';
  }
}

/**
 * Everything the app needs from a payment provider. Mutations never write to
 * our database: the provider confirms them with a webhook, and only the
 * webhook (apply_billing_event) changes `subscriptions`. No card data ever
 * touches this code; checkout is always a provider-hosted page.
 */
export interface BillingProvider {
  readonly id: 'fake' | 'iyzico' | 'paddle' | 'polar' | 'lemonsqueezy';

  /** Returns the provider-hosted page the user is sent to. */
  createCheckout(context: CheckoutContext): Promise<{ url: string }>;

  /** Stops renewal at the end of the paid period. */
  cancel(subscription: SubscriptionSnapshot): Promise<void>;

  /** Undoes a pending period-end cancellation. */
  resume(subscription: SubscriptionSnapshot): Promise<void>;

  /** Moves to another plan, interval or seat count. */
  changePlan(
    subscription: SubscriptionSnapshot,
    next: { planId: PaidPlanId; interval: BillingInterval; seats: number },
  ): Promise<void>;

  /**
   * Verifies the signature on the raw body and translates the provider payload
   * into neutral events. Throws WebhookSignatureError on a bad signature.
   */
  parseWebhook(rawBody: string, headers: Headers): Promise<BillingEvent[]>;
}
