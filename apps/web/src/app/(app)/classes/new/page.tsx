import { getTranslations } from 'next-intl/server';

import { NewClassForm } from './new-class-form';

import { PageHeader } from '@/components/patterns/page-header';

export default async function NewClassPage() {
  const t = await getTranslations('classes.new');

  return (
    <div>
      <PageHeader title={t('title')} />
      <div className="max-w-sm p-6">
        <NewClassForm />
      </div>
    </div>
  );
}
