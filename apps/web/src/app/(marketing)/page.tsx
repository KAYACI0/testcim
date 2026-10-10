import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import {
  ClosingSection,
  FaqSection,
  FeaturesSection,
  FlowSection,
  HeroSection,
  MarqueeSection,
  TrustSection,
  TrySection,
} from '@/features/marketing/landing-sections';
import { Reveal } from '@/features/marketing/motion';
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
    <div className="text-lg">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(structuredData) }}
      />

      <HeroSection />
      <MarqueeSection />
      <FlowSection />
      <TrySection />
      <FeaturesSection />
      <TrustSection />

      <section
        id="fiyat"
        aria-labelledby="pricing-heading"
        className="mx-auto w-full max-w-6xl scroll-mt-16 px-4 pt-28 sm:px-6"
      >
        <Reveal className="max-w-3xl">
          <h2
            id="pricing-heading"
            className="font-display text-[clamp(32px,4.4vw,52px)] leading-[1.1] font-semibold tracking-[-0.015em]"
          >
            {t('pricingTitle')}
          </h2>
          <p className="mt-4 text-xl text-ink-2">{t('pricingLead')}</p>
        </Reveal>
        <Reveal
          delay={100}
          className="mt-10 rounded-dialog border border-line p-6 text-base sm:p-8"
        >
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
        </Reveal>
      </section>

      <FaqSection />
      <ClosingSection />
    </div>
  );
}
