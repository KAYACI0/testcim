import Link from 'next/link';
import { getFormatter, getTranslations } from 'next-intl/server';

import { formatMinor, limit, UNLIMITED } from '@testcim/shared';

import { BillingProfileForm, CancelOrResume, CouponForm, PlanPicker } from './billing-forms';

import { UpgradeNote } from '@/components/patterns/upgrade-note';
import { UsageMeter } from '@/components/patterns/usage-meter';
import { Badge } from '@/components/ui/badge';
import { InlineNotice } from '@/components/ui/inline-notice';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/table';
import { getBillingProvider } from '@/features/billing/registry.server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/current';
import { getEntitlements } from '@/lib/workspace/entitlements.server';

const TRACKED_METRICS = [
  'pdf_exports_per_month',
  'ai_credits_per_month',
  'omr_scans_per_month',
] as const;

const STATUS_TONE = {
  active: 'ok',
  trialing: 'accent',
  past_due: 'warn',
  canceled: 'neutral',
} as const;

export default async function BillingSettingsPage() {
  const workspace = await getCurrentWorkspace();
  const entitlements = await getEntitlements(workspace.id);
  const supabase = await createClient();
  const t = await getTranslations('settings.billing');
  const tPlan = await getTranslations('settings.plan');
  const format = await getFormatter();

  const periodStart = new Date();
  periodStart.setDate(1);
  const periodStartIso = periodStart.toISOString().slice(0, 10);
  const canManage = workspace.role === 'owner' || workspace.role === 'admin';

  const [subscription, plans, usage, invoices, profile, members] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('workspace_id', workspace.id).maybeSingle(),
    supabase.from('plans').select('*').eq('is_active', true).order('sort_order'),
    supabase
      .from('usage_counters')
      .select('metric, value')
      .eq('workspace_id', workspace.id)
      .eq('period_start', periodStartIso),
    canManage
      ? supabase
          .from('billing_invoices')
          .select('*')
          .eq('workspace_id', workspace.id)
          .order('issued_at', { ascending: false })
          .limit(24)
      : Promise.resolve({ data: [] }),
    canManage
      ? supabase.from('billing_profiles').select('*').eq('workspace_id', workspace.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('workspace_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('workspace_id', workspace.id),
  ]);

  const sub = subscription.data;
  const planRows = plans.data ?? [];
  const currentPlan = planRows.find((plan) => plan.id === workspace.planId);
  const paidPlans = planRows.filter((plan) => plan.id !== 'free');
  const usageByMetric = new Map((usage.data ?? []).map((row) => [row.metric, row.value]));
  const providerEnabled = getBillingProvider() !== null;
  const hasPaidSub = sub !== null && sub.status !== 'canceled' && sub.provider !== 'manual';
  const dateOf = (value: string) => format.dateTime(new Date(value), { dateStyle: 'long' });
  const seatTotal = limit(entitlements, 'seats');
  const seatsUsed = members.count ?? 0;

  const planOptions = paidPlans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    monthlyLabel:
      plan.price_monthly_minor === null
        ? null
        : formatMinor(plan.price_monthly_minor, plan.currency),
    yearlyLabel:
      plan.price_yearly_minor === null ? null : formatMinor(plan.price_yearly_minor, plan.currency),
  }));

  return (
    <div className="flex max-w-2xl flex-col gap-10">
      <section className="flex flex-col gap-3" aria-labelledby="plan-heading">
        <h2 id="plan-heading" className="text-lg font-semibold text-ink">
          {t('title')}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-ink">
            {t('currentPlan')}:{' '}
            <span className="font-medium">{currentPlan?.name ?? workspace.planId}</span>
          </p>
          {sub && <Badge tone={STATUS_TONE[sub.status]}>{t(`status.${sub.status}`)}</Badge>}
        </div>
        {sub?.status === 'trialing' && sub.current_period_end && (
          <p className="text-sm text-ink-2">
            {t('trialEnds', { date: dateOf(sub.current_period_end) })}
          </p>
        )}
        {sub?.status === 'active' && sub.current_period_end && !sub.cancel_at_period_end && (
          <p className="text-sm text-ink-2">
            {t('renewal', { date: dateOf(sub.current_period_end) })}
          </p>
        )}
        {sub?.cancel_at_period_end && sub.current_period_end && (
          <InlineNotice tone="warn">
            {t('cancelScheduled', { date: dateOf(sub.current_period_end) })}
          </InlineNotice>
        )}
        {sub?.status === 'past_due' && <InlineNotice tone="warn">{t('pastDue')}</InlineNotice>}
        {sub?.status === 'canceled' && <InlineNotice>{t('downgradeNote')}</InlineNotice>}
        {!canManage && <p className="text-sm text-ink-2">{t('readOnlyRole')}</p>}
        {!providerEnabled && <InlineNotice>{t('billingDisabled')}</InlineNotice>}
      </section>

      <section className="flex flex-col gap-4" aria-labelledby="usage-heading">
        <h2 id="usage-heading" className="text-lg font-semibold text-ink">
          {t('usageTitle')}
        </h2>
        {TRACKED_METRICS.map((metric) => {
          const cap = limit(entitlements, metric);
          const used = usageByMetric.get(metric) ?? 0;

          if (cap === UNLIMITED) {
            return (
              <p key={metric} className="text-sm text-ink-2">
                {tPlan(`metrics.${metric}`)}: {tPlan('unlimited')}
              </p>
            );
          }

          return (
            <UsageMeter
              key={metric}
              label={tPlan(`metrics.${metric}`)}
              value={used}
              max={cap}
              summary={`${used} / ${cap}`}
            />
          );
        })}
        {workspace.planId === 'free' && <UpgradeNote message={tPlan('upgradeMessage')} />}
      </section>

      {seatTotal > 1 && (
        <section className="flex flex-col gap-2" aria-labelledby="seats-heading">
          <h2 id="seats-heading" className="text-lg font-semibold text-ink">
            {t('seats.title')}
          </h2>
          <p className="text-sm text-ink-2">
            {t('seats.summary', { used: seatsUsed, total: seatTotal })}
          </p>
          {seatsUsed > seatTotal && <InlineNotice tone="warn">{t('seats.overLimit')}</InlineNotice>}
          <Link href="/settings/members" className="w-fit text-sm text-accent hover:underline">
            {t('seats.manage')}
          </Link>
        </section>
      )}

      {paidPlans.length > 0 && (
        <section className="flex flex-col gap-4" aria-labelledby="change-heading">
          <h2 id="change-heading" className="text-lg font-semibold text-ink">
            {t(hasPaidSub ? 'changePlanTitle' : 'choosePlanTitle')}
          </h2>
          <PlanPicker
            workspaceId={workspace.id}
            plans={planOptions}
            currentPlanId={hasPaidSub ? (sub?.plan_id ?? null) : null}
            disabled={!canManage || !providerEnabled}
          />
          {hasPaidSub && (
            <CancelOrResume
              workspaceId={workspace.id}
              cancelScheduled={sub?.cancel_at_period_end ?? false}
              disabled={!canManage || !providerEnabled}
            />
          )}
        </section>
      )}

      {canManage && (
        <>
          <section className="flex flex-col gap-3" aria-labelledby="coupon-heading">
            <h2 id="coupon-heading" className="text-lg font-semibold text-ink">
              {t('coupon.title')}
            </h2>
            <p className="text-sm text-ink-2">{t('coupon.description')}</p>
            <div className="max-w-sm">
              <CouponForm workspaceId={workspace.id} disabled={false} />
            </div>
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="profile-heading">
            <h2 id="profile-heading" className="text-lg font-semibold text-ink">
              {t('profile.title')}
            </h2>
            <p className="text-sm text-ink-2">{t('profile.description')}</p>
            <div className="max-w-sm">
              <BillingProfileForm
                workspaceId={workspace.id}
                disabled={false}
                defaults={{
                  legalName: profile.data?.legal_name ?? '',
                  taxOffice: profile.data?.tax_office ?? '',
                  taxNumber: profile.data?.tax_number ?? '',
                  address: profile.data?.address ?? '',
                  invoiceEmail: profile.data?.invoice_email ?? '',
                }}
              />
            </div>
          </section>

          <section className="flex flex-col gap-3" aria-labelledby="invoices-heading">
            <h2 id="invoices-heading" className="text-lg font-semibold text-ink">
              {t('invoices.title')}
            </h2>
            {(invoices.data ?? []).length === 0 ? (
              <p className="text-sm text-ink-2">{t('invoices.empty')}</p>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t('invoices.date')}</TableHeaderCell>
                    <TableHeaderCell>{t('invoices.amount')}</TableHeaderCell>
                    <TableHeaderCell>{t('invoices.status')}</TableHeaderCell>
                    <TableHeaderCell>{t('invoices.document')}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(invoices.data ?? []).map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{dateOf(invoice.issued_at)}</TableCell>
                      <TableCell>{formatMinor(invoice.amount_minor, invoice.currency)}</TableCell>
                      <TableCell>{t(`invoices.statuses.${invoice.status}`)}</TableCell>
                      <TableCell>
                        {invoice.document_url ? (
                          <a
                            href={invoice.document_url}
                            className="text-accent hover:underline"
                            rel="noreferrer"
                            target="_blank"
                          >
                            {t('invoices.view')}
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
