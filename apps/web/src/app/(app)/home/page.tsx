import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/patterns/page-header';
import { Button } from '@/components/ui/button';

export default async function HomePage() {
  const t = await getTranslations('home');

  return (
    <PageHeader
      title={t('appHomeTitle')}
      action={
        <Button asChild>
          <Link href="/tests/new">{t('newTestAction')}</Link>
        </Button>
      }
    />
  );
}
