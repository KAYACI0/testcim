import { getTranslations } from 'next-intl/server';

import { LegalPlaceholder } from '@/features/marketing/legal-placeholder';
import { marketingMetadata } from '@/lib/seo';

export async function generateMetadata() {
  return marketingMetadata('privacy');
}

export default async function Page() {
  const t = await getTranslations('legal');

  return <LegalPlaceholder title={t('privacyTitle')} />;
}
