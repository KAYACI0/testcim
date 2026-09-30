import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { ClassesListClient } from './classes-list-client';

import { PageHeader } from '@/components/patterns/page-header';
import { Button } from '@/components/ui/button';
import { listClasses } from '@/features/classes/actions.server';

export default async function ClassesListPage() {
  const [classes, t] = await Promise.all([listClasses(), getTranslations('classes.list')]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t('title')}
        description={t('description')}
        action={
          <Button asChild>
            <Link href="/classes/new">{t('create')}</Link>
          </Button>
        }
      />
      <div className="p-4">
        <ClassesListClient classes={classes} />
      </div>
    </div>
  );
}
