import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { marketingMetadata } from '@/lib/seo';

export async function generateMetadata() {
  return marketingMetadata('about');
}

export default async function AboutPage() {
  const t = await getTranslations('marketing.about');

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-ink sm:text-4xl">{t('title')}</h1>
      <p className="mt-4 text-lg text-ink-2">{t('body1')}</p>
      <p className="mt-4 text-ink-2">{t('body2')}</p>
      <p className="mt-6">
        <Link href="/contact" className="font-medium text-accent hover:underline">
          {t('contactLink')}
        </Link>
      </p>
    </div>
  );
}
