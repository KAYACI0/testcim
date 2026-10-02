import { getTranslations } from 'next-intl/server';

import type { MarketingPageKey } from './site';
import type { Metadata } from 'next';

import { absoluteUrl, MARKETING_PAGES } from '@/lib/site';

/** Title, description, canonical and Open Graph for one marketing page, all from messages. */
export async function marketingMetadata(key: MarketingPageKey): Promise<Metadata> {
  const t = await getTranslations('marketing.pages');
  const page = MARKETING_PAGES.find((entry) => entry.key === key);
  const path = page?.path ?? '/';
  const title = t(`${key}.title`);
  const description = t(`${key}.description`);

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: { title, description, url: absoluteUrl(path), type: 'website', locale: 'tr_TR' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

/** Serializes structured data for a JSON-LD script; `<` is escaped so content can never close the tag. */
export function jsonLdString(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\u003c');
}
