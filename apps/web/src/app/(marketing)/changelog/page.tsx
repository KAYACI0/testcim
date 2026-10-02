import { getTranslations } from 'next-intl/server';

import { marketingMetadata } from '@/lib/seo';

export async function generateMetadata() {
  return marketingMetadata('changelog');
}

export default async function ChangelogPage() {
  const t = await getTranslations('marketing.changelog');
  const items = t.raw('items') as string[];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-ink sm:text-4xl">{t('title')}</h1>
      <p className="mt-2 text-lg text-ink-2">{t('lead')}</p>

      <div className="mt-10 border-t border-line pt-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <h2 className="text-xl font-semibold text-ink">{t('versionLabel')}</h2>
          <span className="text-sm text-ink-3">{t('dateLabel')}</span>
        </div>

        <ul className="mt-6 space-y-3">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-3 text-ink-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-sm bg-accent" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
