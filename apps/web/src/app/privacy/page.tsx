import { getTranslations } from 'next-intl/server';

export default async function PrivacyPage() {
  const t = await getTranslations('legal');

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-[22px] font-semibold text-ink">{t('privacyTitle')}</h1>
      <p className="mt-2 text-ink-2">{t('pendingNotice')}</p>
    </main>
  );
}
