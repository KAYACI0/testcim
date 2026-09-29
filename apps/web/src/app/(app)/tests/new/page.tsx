import { getTranslations } from 'next-intl/server';

import { NewTestForm } from './new-test-form';

import { PageHeader } from '@/components/patterns/page-header';

export default async function NewTestPage() {
  const t = await getTranslations('tests.new');

  return (
    <div>
      <PageHeader title={t('title')} />
      <div className="max-w-sm p-6">
        <NewTestForm />
      </div>
    </div>
  );
}
