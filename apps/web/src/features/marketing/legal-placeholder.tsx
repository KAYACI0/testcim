import { getTranslations } from 'next-intl/server';

import { InlineNotice } from '@/components/ui/inline-notice';

/** Placeholder body for legal pages until the lawyer-written text replaces it. */
export async function LegalPlaceholder({ title }: { readonly title: string }) {
  const t = await getTranslations('legal');

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-ink sm:text-4xl">{title}</h1>
      <div className="mt-6">
        <InlineNotice tone="warn">
          <p className="font-medium">{t('pendingNotice')}</p>
          <p className="mt-1">{t('pendingDetail')}</p>
        </InlineNotice>
      </div>
    </div>
  );
}
