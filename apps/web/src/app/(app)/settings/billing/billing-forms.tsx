'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import { Textarea } from '@/components/ui/textarea';
import {
  cancelSubscription,
  changePlan,
  redeemCoupon,
  resumeSubscription,
  saveBillingProfile,
  startCheckout,
  type BillingActionState,
} from '@/features/billing/actions.server';

const initial: BillingActionState = { status: 'idle' };

function ActionNotice({
  state,
  doneKey,
}: {
  readonly state: BillingActionState;
  readonly doneKey?: string;
}) {
  const t = useTranslations('settings.billing');

  if (state.status === 'error') {
    return <InlineNotice tone="err">{t(`errors.${state.code ?? 'failed'}`)}</InlineNotice>;
  }
  if (state.status === 'done' && doneKey) {
    return <InlineNotice tone="ok">{t(doneKey)}</InlineNotice>;
  }
  return null;
}

export interface PlanOption {
  readonly id: string;
  readonly name: string;
  readonly monthlyLabel: string | null;
  readonly yearlyLabel: string | null;
}

/** Plan list with a billing-period switch. `currentPlanId` switches the verb from start to change. */
export function PlanPicker({
  workspaceId,
  plans,
  currentPlanId,
  disabled,
}: {
  readonly workspaceId: string;
  readonly plans: readonly PlanOption[];
  readonly currentPlanId: string | null;
  readonly disabled: boolean;
}) {
  const t = useTranslations('settings.billing');
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const [state, action, pending] = useActionState(
    currentPlanId ? changePlan : startCheckout,
    initial,
  );

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        aria-label={t('intervalLabel')}
        value={interval}
        onValueChange={(next) => setInterval(next === 'year' ? 'year' : 'month')}
        options={[
          { value: 'month', label: t('interval.month') },
          { value: 'year', label: t('interval.year') },
        ]}
      />
      <ul className="flex flex-col divide-y divide-line border-y border-line">
        {plans.map((plan) => {
          const label = interval === 'year' ? plan.yearlyLabel : plan.monthlyLabel;
          const isCurrent = plan.id === currentPlanId;

          return (
            <li key={plan.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-ink">{plan.name}</p>
                <p className="text-sm text-ink-2">
                  {label
                    ? t(interval === 'year' ? 'pricePerYear' : 'pricePerMonth', { price: label })
                    : t('priceTbd')}
                </p>
              </div>
              {isCurrent ? (
                <span className="text-sm text-ink-2">{t('current')}</span>
              ) : (
                <form action={action}>
                  <input type="hidden" name="workspaceId" value={workspaceId} />
                  <input type="hidden" name="planId" value={plan.id} />
                  <input type="hidden" name="interval" value={interval} />
                  <Button
                    type="submit"
                    size="sm"
                    variant={currentPlanId ? 'secondary' : 'primary'}
                    loading={pending}
                    disabled={disabled || !label}
                  >
                    {t(currentPlanId ? 'switchTo' : 'chooseTo', { plan: plan.name })}
                  </Button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
      <ActionNotice state={state} doneKey="planChanged" />
    </div>
  );
}

export function CancelOrResume({
  workspaceId,
  cancelScheduled,
  disabled,
}: {
  readonly workspaceId: string;
  readonly cancelScheduled: boolean;
  readonly disabled: boolean;
}) {
  const t = useTranslations('settings.billing');
  const [state, action, pending] = useActionState(
    cancelScheduled ? resumeSubscription : cancelSubscription,
    initial,
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {!cancelScheduled && <p className="text-sm text-ink-2">{t('cancelHint')}</p>}
      <div>
        <Button type="submit" variant="secondary" size="sm" loading={pending} disabled={disabled}>
          {t(cancelScheduled ? 'resume' : 'cancel')}
        </Button>
      </div>
      <ActionNotice state={state} />
    </form>
  );
}

export function CouponForm({
  workspaceId,
  disabled,
}: {
  readonly workspaceId: string;
  readonly disabled: boolean;
}) {
  const t = useTranslations('settings.billing.coupon');
  const [state, action, pending] = useActionState(redeemCoupon, initial);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <FormField label={t('label')}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            name="couponCode"
            required
            disabled={disabled}
            autoComplete="off"
          />
        )}
      </FormField>
      <ActionNotice state={state} doneKey="coupon.applied" />
      <div>
        <Button type="submit" variant="secondary" size="sm" loading={pending} disabled={disabled}>
          {t('apply')}
        </Button>
      </div>
    </form>
  );
}

export interface ProfileDefaults {
  readonly legalName: string;
  readonly taxOffice: string;
  readonly taxNumber: string;
  readonly address: string;
  readonly invoiceEmail: string;
}

export function BillingProfileForm({
  workspaceId,
  defaults,
  disabled,
}: {
  readonly workspaceId: string;
  readonly defaults: ProfileDefaults;
  readonly disabled: boolean;
}) {
  const t = useTranslations('settings.billing.profile');
  const [state, action, pending] = useActionState(saveBillingProfile, initial);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <FormField label={t('legalName')}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            name="legalName"
            defaultValue={defaults.legalName}
            disabled={disabled}
          />
        )}
      </FormField>
      <FormField label={t('taxOffice')}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            name="taxOffice"
            defaultValue={defaults.taxOffice}
            disabled={disabled}
          />
        )}
      </FormField>
      <FormField label={t('taxNumber')} hint={t('taxNumberHint')}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            name="taxNumber"
            defaultValue={defaults.taxNumber}
            inputMode="numeric"
            disabled={disabled}
          />
        )}
      </FormField>
      <FormField label={t('address')}>
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            name="address"
            defaultValue={defaults.address}
            disabled={disabled}
            rows={3}
          />
        )}
      </FormField>
      <FormField label={t('invoiceEmail')}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            name="invoiceEmail"
            type="email"
            defaultValue={defaults.invoiceEmail}
            disabled={disabled}
          />
        )}
      </FormField>
      <ActionNotice state={state} doneKey="profile.saved" />
      {!disabled && (
        <div>
          <Button type="submit" loading={pending}>
            {t('save')}
          </Button>
        </div>
      )}
    </form>
  );
}
