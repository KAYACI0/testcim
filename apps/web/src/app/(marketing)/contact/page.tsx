import { getTranslations } from 'next-intl/server';

import { PublicForm } from '@/features/marketing/public-form';
import { marketingMetadata } from '@/lib/seo';

export async function generateMetadata() {
  return marketingMetadata('contact');
}

export default async function ContactPage() {
  const t = await getTranslations('marketing.contact');

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold text-ink sm:text-4xl">{t('title')}</h1>
      <p className="mt-3 text-lg text-ink-2">{t('lead')}</p>
      <div className="mt-8">
        <PublicForm kind="contact" />
      </div>
    </div>
  );
}
