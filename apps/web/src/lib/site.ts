import { clientEnv } from '@/lib/env.client';

/** Public marketing routes, in footer and sitemap order. `titleKey` indexes `marketing.pages`. */
export const MARKETING_PAGES = [
  { path: '/', key: 'home', priority: 1 },
  { path: '/features', key: 'features', priority: 0.9 },
  { path: '/pricing', key: 'pricing', priority: 0.9 },
  { path: '/help', key: 'help', priority: 0.7 },
  { path: '/about', key: 'about', priority: 0.5 },
  { path: '/contact', key: 'contact', priority: 0.5 },
  { path: '/privacy', key: 'privacy', priority: 0.3 },
  { path: '/kvkk', key: 'kvkk', priority: 0.3 },
  { path: '/terms', key: 'terms', priority: 0.3 },
  { path: '/refund', key: 'refund', priority: 0.3 },
  { path: '/copyright', key: 'copyright', priority: 0.3 },
] as const;

export type MarketingPageKey = (typeof MARKETING_PAGES)[number]['key'];

export function absoluteUrl(path: string): string {
  return new URL(path, clientEnv.NEXT_PUBLIC_SITE_URL).toString();
}

export function isMarketingPath(pathname: string): boolean {
  return MARKETING_PAGES.some((page) => page.path === pathname);
}
