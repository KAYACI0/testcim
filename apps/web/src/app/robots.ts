import { absoluteUrl } from '@/lib/site';

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/home',
          '/tests',
          '/bank',
          '/classes',
          '/exams',
          '/reports',
          '/settings',
          '/s/',
        ],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
