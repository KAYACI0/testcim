'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Segmented } from '@/components/ui/segmented';
import { cn } from '@/lib/cn';

export interface PricingPreviewTier {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly points: readonly string[];
  /** Preformatted price labels; null when the plan has no public price. */
  readonly monthly: string | null;
  readonly yearly: string | null;
  readonly yearlyPerMonth: string | null;
  readonly cta: string;
  readonly featured: boolean;
}

export function PricingPreview({ tiers }: { readonly tiers: readonly PricingPreviewTier[] }) {
  const t = useTranslations('marketing.pricing');
  const th = useTranslations('marketing.home.pricing');
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
        className="self-start"
      />
      <ul className="grid gap-4 md:grid-cols-3">
        {tiers.map((tier) => {
          const price = interval === 'year' ? tier.yearly : tier.monthly;

          return (
            <li
              key={tier.id}
              className={cn(
                'flex flex-col gap-5 rounded-panel border bg-surface p-6',
                tier.featured ? 'border-accent' : 'border-line',
              )}
            >
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-semibold text-ink">{tier.name}</h3>
                <p className="text-sm text-ink-2">{tier.description}</p>
              </div>
              <div className="flex min-h-14 flex-col justify-center">
                <p
                  className={cn(
                    'font-semibold text-ink tabular-nums',
                    tier.id !== 'free' && !price ? 'text-lg' : 'text-3xl',
                  )}
                >
                  {tier.id === 'free'
                    ? t('freePrice')
                    : price
                      ? t(interval === 'year' ? 'perYear' : 'perMonth', { price })
                      : th('contact')}
                </p>
                {interval === 'year' && tier.id !== 'free' && price && tier.yearlyPerMonth && (
                  <p className="text-sm text-ink-2">
                    {t('yearlyPerMonth', { price: tier.yearlyPerMonth })}
                  </p>
                )}
              </div>
              <ul className="flex flex-1 flex-col gap-2 border-t border-line pt-4 text-sm text-ink">
                {tier.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span aria-hidden="true" className="mt-2 h-px w-3 shrink-0 bg-accent" />
                    {point}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={cn(
                  'inline-flex h-10 items-center justify-center rounded-control px-4 text-sm font-medium',
                  tier.featured
                    ? 'bg-accent text-surface hover:bg-accent-hover'
                    : 'border border-line-strong text-ink hover:bg-canvas',
                )}
              >
                {tier.cta}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
