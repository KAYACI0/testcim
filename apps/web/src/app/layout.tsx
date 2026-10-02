import { IBM_Plex_Sans } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import type { Metadata } from 'next';

import { Analytics } from '@/components/patterns/analytics';
import { CookieConsent } from '@/components/patterns/cookie-consent';

import './globals.css';

const plexSans = IBM_Plex_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-plex-sans',
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('common');

  return {
    title: t('appName'),
    icons: {
      icon: [{ url: '/brand/icon-mark.svg', type: 'image/svg+xml' }],
      apple: '/brand/icon-mark.svg',
    },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={plexSans.variable}>
      <body>
        <NextIntlClientProvider>
          {children}
          <CookieConsent />
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
