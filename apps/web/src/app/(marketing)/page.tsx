import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import {
  ClosingSection,
  FaqSection,
  FeaturesSection,
  FlowSection,
} from '@/features/marketing/landing-sections';
import { PasteDemo } from '@/features/marketing/paste-demo';
import { getPricingTableData } from '@/features/marketing/pricing-data.server';
import { PricingTable } from '@/features/marketing/pricing-table';
import { jsonLdString, marketingMetadata } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site';

// The pricing section reads the plans table; refresh the static page every few minutes.
export const revalidate = 300;

export async function generateMetadata() {
  return marketingMetadata('home');
}

export default async function HomePage() {
  const t = await getTranslations('marketing.home');
  const tp = await getTranslations('marketing.pages.home');
  const tpr = await getTranslations('marketing.pricing');
  const { plans, rows } = await getPricingTableData();

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

      <section className="mx-auto w-full max-w-6xl px-4 pt-24 pb-14 sm:px-6">
        <h1 className="max-w-4xl font-display text-[clamp(40px,6vw,76px)] leading-[1.05] font-semibold tracking-[-0.02em]">
          {t('title')}
        </h1>
        <p className="mt-6 max-w-2xl text-[clamp(18px,2vw,21px)] text-on-brand-2">{t('lead')}</p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link
            href="/login"
            className="inline-flex h-13 items-center rounded-control bg-surface px-6 text-lg font-semibold text-accent-hover hover:bg-accent-tint"
          >
            {t('primaryAction')}
          </Link>
          <a
            href="#demo"
            className="inline-flex h-13 items-center rounded-control border border-brand-ghost px-6 text-lg font-medium hover:bg-brand-fill"
          >
            {t('secondaryAction')}
          </a>
        </div>
        <p className="mt-4 text-sm text-on-brand-3">{t('heroNote')}</p>
      </section>

      <section id="demo" className="mx-auto w-full max-w-6xl scroll-mt-6 px-4 sm:px-6">
        <PasteDemo />
      </section>

      <FlowSection />
      <FeaturesSection />

      <section
        aria-labelledby="pricing-heading"
        className="mx-auto w-full max-w-6xl px-4 pt-32 sm:px-6"
      >
        <h2
          id="pricing-heading"
          className="font-display text-[clamp(30px,4vw,46px)] leading-[1.15] font-semibold tracking-[-0.01em]"
        >
          {t('pricingTitle')}
        </h2>
        <p className="mt-3.5 text-on-brand-2">{t('pricingLead')}</p>
        <div className="sheet mt-10 rounded-panel bg-surface p-6 text-base text-ink sm:p-8">
          {plans.length === 0 ? (
            <p className="text-ink-2">{tpr('unavailable')}</p>
          ) : (
            <PricingTable plans={plans} rows={rows} />
          )}
          <p className="mt-6">
            <Link href="/pricing" className="font-medium text-accent hover:underline">
              {t('pricingLink')}
            </Link>
          </p>
        </div>
      </section>

      <FaqSection />
      <ClosingSection />
    </>
  );
}
