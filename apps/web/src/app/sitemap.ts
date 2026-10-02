import type { MetadataRoute } from 'next';

import { absoluteUrl, MARKETING_PAGES } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  return MARKETING_PAGES.map((page) => ({
    url: absoluteUrl(page.path),
    changeFrequency: page.priority >= 0.7 ? 'weekly' : 'monthly',
    priority: page.priority,
  }));
}
