import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { FEATURE_KEYS } from '@/features/marketing/feature-keys';
import { PasteDemo } from '@/features/marketing/paste-demo';
import { jsonLdString, marketingMetadata } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site';

export async function generateMetadata() {
  return marketingMetadata('home');
}

export default async function HomePage() {
  const t = await getTranslations('marketing.home');
  const tf = await getTranslations('marketing.featureItems');
  const tp = await getTranslations('marketing.pages.home');

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

      <section className="mx-auto max-w-5xl px-6 pt-12 pb-12 sm:pt-16">
        <h1 className="max-w-3xl text-4xl leading-tight font-semibold text-ink sm:text-5xl">
          {t('title')}
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-ink-2">{t('lead')}</p>
        <div className="mt-8 max-w-3xl">
          <PasteDemo />
        </div>
      </section>

      <section className="border-t border-line" aria-labelledby="features-heading">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <h2 id="features-heading" className="text-2xl font-semibold text-ink">
            {t('featuresTitle')}
          </h2>
          <ul className="mt-6 divide-y divide-line border-y border-line">
            {FEATURE_KEYS.map((key) => (
              <li key={key} className="grid gap-1 py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
                <h3 className="text-base font-medium text-ink">{tf(`${key}.title`)}</h3>
                <p className="text-ink-2">{tf(`${key}.summary`)}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/features" className="font-medium text-accent hover:underline">
              {t('featuresMore')}
            </Link>
            <Link href="/pricing" className="font-medium text-accent hover:underline">
              {t('pricingLink')}
            </Link>
          </p>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-6 py-12">
          <h2 className="text-2xl font-semibold text-ink">{t('closingTitle')}</h2>
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-control bg-accent px-4 text-sm font-medium text-surface hover:bg-accent-hover"
          >
            {t('closingAction')}
          </Link>
        </div>
      </section>
    </>
  );
}
