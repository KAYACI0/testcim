import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { BookletDemo } from '@/features/marketing/booklet-demo';
import { FEATURE_KEYS } from '@/features/marketing/feature-keys';
import { marketingMetadata } from '@/lib/seo';

export async function generateMetadata() {
  return marketingMetadata('features');
}

export default async function FeaturesPage() {
  const t = await getTranslations('marketing.features');
  const tf = await getTranslations('marketing.featureItems');

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="max-w-3xl text-3xl leading-tight font-semibold text-ink sm:text-4xl">
        {t('title')}
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-ink-2">{t('lead')}</p>

      <div className="mt-10 divide-y divide-line border-y border-line">
        {FEATURE_KEYS.map((key) => (
          <section key={key} className="grid gap-3 py-8 sm:grid-cols-[14rem_1fr] sm:gap-8">
            <h2 className="text-lg font-semibold text-ink">{tf(`${key}.title`)}</h2>
            <div className="flex flex-col gap-4">
              <p className="max-w-2xl text-ink-2">{tf(`${key}.detail`)}</p>
              {key === 'booklets' && (
                <>
                  <p className="text-sm text-ink-2">{t('bookletDemo.caption')}</p>
                  <BookletDemo />
                </>
              )}
            </div>
          </section>
        ))}
        <section className="grid gap-3 py-8 sm:grid-cols-[14rem_1fr] sm:gap-8">
          <h2 className="text-lg font-semibold text-ink">{t('aiTitle')}</h2>
          <p className="max-w-2xl text-ink-2">{t('aiBody')}</p>
        </section>
      </div>

      <p className="mt-8">
        <Link
          href="/login"
          className="inline-flex h-10 items-center rounded-control bg-accent px-4 text-sm font-medium text-surface hover:bg-accent-hover"
        >
          {t('cta')}
        </Link>
      </p>
    </div>
  );
}
