import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { formatMinor, monthlyEquivalentMinor } from '@testcim/shared';

import { FeatureBlocks } from '@/features/marketing/feature-blocks';
import { PasteDemo } from '@/features/marketing/paste-demo';
import { getPublicPlans } from '@/features/marketing/plans.server';
import { PricingPreview, type PricingPreviewTier } from '@/features/marketing/pricing-preview';
import { jsonLdString, marketingMetadata } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site';

export const revalidate = 300;

export async function generateMetadata() {
  return marketingMetadata('home');
}

const TIER_IDS = ['free', 'plus', 'team'] as const;

async function loadPlans() {
  try {
    return await getPublicPlans();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const t = await getTranslations('marketing.home');
  const tp = await getTranslations('marketing.pages.home');
  const tt = await getTranslations('marketing.pricing');
  const plans = await loadPlans();

  const tiers: PricingPreviewTier[] = TIER_IDS.map((id) => {
    const plan = plans.find((candidate) => candidate.id === id);
    const name = id === 'plus' ? (plan?.name ?? 'Plus') : t(`pricing.tiers.${id}.name`);

    return {
      id,
      name,
      description: t(`pricing.tiers.${id}.description`),
      points: t.raw(`pricing.tiers.${id}.points`) as string[],
      monthly:
        plan?.priceMonthlyMinor == null ? null : formatMinor(plan.priceMonthlyMinor, plan.currency),
      yearly:
        plan?.priceYearlyMinor == null ? null : formatMinor(plan.priceYearlyMinor, plan.currency),
      yearlyPerMonth:
        plan?.priceYearlyMinor == null
          ? null
          : formatMinor(monthlyEquivalentMinor(plan.priceYearlyMinor), plan.currency),
      cta: id === 'free' ? tt('startFree') : tt('startWith', { plan: name }),
      featured: id === 'plus',
    };
  });

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Testcim',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    inLanguage: 'tr',
    url: absoluteUrl('/'),
    description: tp('description'),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(structuredData) }}
      />

      <section className="mx-auto max-w-5xl px-6 pt-14 pb-12 sm:pt-20">
        <h1 className="max-w-3xl text-4xl leading-tight font-semibold text-balance text-ink">
          {t('title')}
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-ink-2">{t('lead')}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-control bg-accent px-5 text-base font-medium text-surface hover:bg-accent-hover"
          >
            {t('primaryCta')}
          </Link>
          <a
            href="#demo"
            className="inline-flex h-11 items-center rounded-control border border-line-strong px-5 text-base font-medium text-ink hover:bg-canvas"
          >
            {t('secondaryCta')}
          </a>
        </div>
        <div id="demo" className="mt-12 scroll-mt-6">
          <h2 className="sr-only">{t('demoTitle')}</h2>
          <PasteDemo />
        </div>
      </section>

      <section className="border-y border-line" aria-label={t('trust.label')}>
        <dl className="mx-auto grid max-w-5xl divide-y divide-line px-6 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <div className="flex items-baseline gap-3 py-6 sm:pr-8">
            <dd className="order-1 text-3xl font-semibold text-ink tabular-nums">
              {t('trust.questionsValue')}
            </dd>
            <dt className="order-2 text-ink-2">{t('trust.questionsLabel')}</dt>
          </div>
          <div className="flex items-baseline gap-3 py-6 sm:pl-8">
            <dd className="order-1 text-3xl font-semibold text-ink">{t('trust.teachersValue')}</dd>
            <dt className="order-2 text-ink-2">{t('trust.teachersLabel')}</dt>
          </div>
        </dl>
      </section>

      <section aria-labelledby="features-heading">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 id="features-heading" className="text-3xl font-semibold text-ink">
            {t('featuresTitle')}
          </h2>
          <FeatureBlocks />
          <p className="mt-8 text-sm">
            <Link href="/features" className="font-medium text-accent hover:underline">
              {t('featuresMore')}
            </Link>
          </p>
        </div>
      </section>

      <section className="border-t border-line bg-canvas" aria-labelledby="pricing-heading">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 id="pricing-heading" className="text-3xl font-semibold text-ink">
            {t('pricing.title')}
          </h2>
          <p className="mt-2 mb-8 text-ink-2">{t('pricing.lead')}</p>
          <PricingPreview tiers={tiers} />
          <p className="mt-8 text-sm">
            <Link href="/pricing" className="font-medium text-accent hover:underline">
              {t('pricing.compare')}
            </Link>
          </p>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-5 px-6 py-16">
          <h2 className="text-3xl font-semibold text-ink">{t('closingTitle')}</h2>
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-control bg-accent px-5 text-base font-medium text-surface hover:bg-accent-hover"
          >
            {t('closingAction')}
          </Link>
        </div>
      </section>
    </>
  );
}
