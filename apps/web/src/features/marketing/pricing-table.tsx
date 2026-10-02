'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Segmented } from '@/components/ui/segmented';

export interface PricingPlan {
  readonly id: string;
  readonly name: string;
  /** Preformatted price labels; null while the plan has no price yet. */
  readonly monthly: string | null;
  readonly yearly: string | null;
  readonly yearlyPerMonth: string | null;
}

export interface PricingRow {
  readonly key: string;
  readonly label: string;
  readonly cells: readonly string[];
}

export function PricingTable({
  plans,
  rows,
}: {
  readonly plans: readonly PricingPlan[];
  readonly rows: readonly PricingRow[];
}) {
  const t = useTranslations('marketing.pricing');
  const [interval, setInterval] = useState<'month' | 'year'>('month');

  return (
    <div className="flex flex-col gap-6">
      <Segmented
        aria-label={t('intervalLabel')}
        value={interval}
        onValueChange={(next) => setInterval(next === 'year' ? 'year' : 'month')}
        options={[
          { value: 'month', label: t('month') },
          { value: 'year', label: t('year') },
        ]}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">{t('tableCaption')}</caption>
          <thead>
            <tr className="border-b border-line-strong align-bottom">
              <th scope="col" className="w-1/3 py-3 pr-4 text-left font-normal text-ink-2">
                {t('featureColumn')}
              </th>
              {plans.map((plan) => {
                const price = interval === 'year' ? plan.yearly : plan.monthly;

                return (
                  <th key={plan.id} scope="col" className="px-3 py-3 text-left font-normal">
                    <span className="block text-base font-semibold text-ink">{plan.name}</span>
                    <span className="block text-ink-2">
                      {plan.id === 'free'
                        ? t('freePrice')
                        : price
                          ? t(interval === 'year' ? 'perYear' : 'perMonth', { price })
                          : t('priceTbd')}
                    </span>
                    {interval === 'year' && plan.yearlyPerMonth && (
                      <span className="block text-xs text-ink-2">
                        {t('yearlyPerMonth', { price: plan.yearlyPerMonth })}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-line">
                <th scope="row" className="py-3 pr-4 text-left font-normal text-ink-2">
                  {row.label}
                </th>
                {row.cells.map((cell, index) => (
                  <td key={plans[index]?.id ?? index} className="px-3 py-3 text-ink">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td />
              {plans.map((plan) => (
                <td key={plan.id} className="px-3 py-4">
                  <Link
                    href="/login"
                    className="inline-flex h-10 items-center rounded-control border border-line-strong px-4 text-sm font-medium text-ink hover:bg-canvas"
                  >
                    {plan.id === 'free' ? t('startFree') : t('startWith', { plan: plan.name })}
                  </Link>
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
