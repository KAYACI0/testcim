'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import {
  PAID_PLAN_IDS,
  billingProfileSchema,
  checkoutRequestSchema,
  couponCodeSchema,
  type PaidPlanId,
} from '@testcim/shared';

import { priceFor } from './prices.server';
import { getBillingProvider } from './registry.server';

import type { SubscriptionSnapshot } from './provider';

import { requireSession } from '@/lib/auth/dal';
import { clientEnv } from '@/lib/env.client';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/workspace/entitlements.server';

export interface BillingActionState {
  readonly status: 'idle' | 'done' | 'error';
  readonly code?:
    | 'invalid_input'
    | 'billing_disabled'
    | 'price_unavailable'
    | 'no_subscription'
    | 'coupon_invalid'
    | 'coupon_already_used'
    | 'trial_not_available'
    | 'failed';
}

const workspaceIdSchema = z.uuid();
const ADMIN_ROLES: ('owner' | 'admin')[] = ['owner', 'admin'];

function isPaidPlan(value: string): value is PaidPlanId {
  return (PAID_PLAN_IDS as readonly string[]).includes(value);
}

async function loadSnapshot(workspaceId: string): Promise<SubscriptionSnapshot | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('subscriptions')
    .select('plan_id, provider, provider_ref, seats, billing_interval, current_period_end, status')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (
    !data ||
    !isPaidPlan(data.plan_id) ||
    data.status === 'canceled' ||
    data.provider === 'manual'
  ) {
    return null;
  }

  return {
    workspaceId,
    providerRef: data.provider_ref,
    planId: data.plan_id,
    interval: data.billing_interval,
    seats: data.seats,
    currentPeriodEnd: data.current_period_end,
  };
}

/** Sends the user to the provider-hosted checkout page for the chosen plan. */
export async function startCheckout(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  await requireSession();
  const workspaceId = workspaceIdSchema.safeParse(formData.get('workspaceId'));
  const request = checkoutRequestSchema.safeParse({
    planId: formData.get('planId'),
    interval: formData.get('interval'),
    seats: 1,
    couponCode: formData.get('couponCode') || undefined,
  });

  if (!workspaceId.success || !request.success) {
    return { status: 'error', code: 'invalid_input' };
  }

  await requireRole(workspaceId.data, ADMIN_ROLES);

  const provider = getBillingProvider();
  if (!provider) {
    return { status: 'error', code: 'billing_disabled' };
  }

  if ((await priceFor(request.data.planId, request.data.interval)) === null) {
    return { status: 'error', code: 'price_unavailable' };
  }

  const session = await requireSession();
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId.data)
    .single();

  const { url } = await provider.createCheckout({
    workspaceId: workspaceId.data,
    workspaceName: workspace?.name ?? '',
    customerEmail: session.email,
    request: request.data,
    returnUrl: `${clientEnv.NEXT_PUBLIC_SITE_URL}/settings/billing`,
  });

  redirect(url);
}

async function mutate(
  formData: FormData,
  run: (
    provider: NonNullable<ReturnType<typeof getBillingProvider>>,
    snapshot: SubscriptionSnapshot,
  ) => Promise<void>,
): Promise<BillingActionState> {
  await requireSession();
  const workspaceId = workspaceIdSchema.safeParse(formData.get('workspaceId'));

  if (!workspaceId.success) {
    return { status: 'error', code: 'invalid_input' };
  }

  await requireRole(workspaceId.data, ADMIN_ROLES);

  const provider = getBillingProvider();
  if (!provider) {
    return { status: 'error', code: 'billing_disabled' };
  }

  const snapshot = await loadSnapshot(workspaceId.data);
  if (!snapshot) {
    return { status: 'error', code: 'no_subscription' };
  }

  try {
    await run(provider, snapshot);
  } catch {
    return { status: 'error', code: 'failed' };
  }

  revalidatePath('/settings/billing');
  revalidatePath('/', 'layout');
  return { status: 'done' };
}

export async function cancelSubscription(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  return mutate(formData, (provider, snapshot) => provider.cancel(snapshot));
}

export async function resumeSubscription(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  return mutate(formData, (provider, snapshot) => provider.resume(snapshot));
}

export async function changePlan(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  const next = checkoutRequestSchema.safeParse({
    planId: formData.get('planId'),
    interval: formData.get('interval'),
  });

  if (!next.success) {
    return { status: 'error', code: 'invalid_input' };
  }

  if ((await priceFor(next.data.planId, next.data.interval)) === null) {
    return { status: 'error', code: 'price_unavailable' };
  }

  return mutate(formData, (provider, snapshot) =>
    provider.changePlan(snapshot, {
      planId: next.data.planId,
      interval: next.data.interval,
      seats: snapshot.seats,
    }),
  );
}

export async function saveBillingProfile(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  await requireSession();
  const workspaceId = workspaceIdSchema.safeParse(formData.get('workspaceId'));
  const profile = billingProfileSchema.safeParse({
    legalName: formData.get('legalName') ?? '',
    taxOffice: formData.get('taxOffice') ?? '',
    taxNumber: formData.get('taxNumber') ?? '',
    address: formData.get('address') ?? '',
    invoiceEmail: formData.get('invoiceEmail') ?? '',
  });

  if (!workspaceId.success || !profile.success) {
    return { status: 'error', code: 'invalid_input' };
  }

  await requireRole(workspaceId.data, ADMIN_ROLES);

  const supabase = await createClient();
  const { error } = await supabase.from('billing_profiles').upsert({
    workspace_id: workspaceId.data,
    legal_name: profile.data.legalName,
    tax_office: profile.data.taxOffice,
    tax_number: profile.data.taxNumber,
    address: profile.data.address,
    invoice_email: profile.data.invoiceEmail,
  });

  if (error) {
    return { status: 'error', code: 'failed' };
  }

  revalidatePath('/settings/billing');
  return { status: 'done' };
}

export async function redeemCoupon(
  _prev: BillingActionState,
  formData: FormData,
): Promise<BillingActionState> {
  await requireSession();
  const workspaceId = workspaceIdSchema.safeParse(formData.get('workspaceId'));
  const code = couponCodeSchema.safeParse(formData.get('couponCode'));

  if (!workspaceId.success || !code.success) {
    return { status: 'error', code: 'invalid_input' };
  }

  await requireRole(workspaceId.data, ADMIN_ROLES);

  const supabase = await createClient();
  const { error } = await supabase.rpc('redeem_coupon', {
    p_ws: workspaceId.data,
    p_code: code.data,
  });

  if (error) {
    const known = ['coupon_invalid', 'coupon_already_used', 'trial_not_available'] as const;
    const match = known.find((value) => error.message.includes(value));
    return { status: 'error', code: match ?? 'failed' };
  }

  revalidatePath('/settings/billing');
  revalidatePath('/', 'layout');
  return { status: 'done' };
}
