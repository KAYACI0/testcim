'use client';

import * as Sentry from '@sentry/nextjs';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import { useEffect } from 'react';

import messages from '../../messages/tr.json';

/**
 * Last-resort boundary. It replaces the root layout, so the intl provider is supplied
 * here with the Turkish messages bundled statically. Designed error states arrive with
 * the design system slice.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="tr">
      <body>
        <NextIntlClientProvider locale="tr" messages={messages}>
          <GlobalErrorBody />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

function GlobalErrorBody() {
  const t = useTranslations('errors');

  return (
    <main>
      <h1>{t('globalTitle')}</h1>
      <p>{t('globalBody')}</p>
      <button type="button" onClick={() => window.location.reload()}>
        {t('retry')}
      </button>
    </main>
  );
}
