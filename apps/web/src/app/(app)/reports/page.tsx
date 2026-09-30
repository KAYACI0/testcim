import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/patterns/page-header';
import { listClasses } from '@/features/classes/actions.server';

export default async function ReportsPage() {
  const [classes, t] = await Promise.all([listClasses(), getTranslations('reports.list')]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={t('title')} description={t('description')} />
      <div className="flex flex-col gap-2 p-4">
        {classes.length === 0 && <p className="text-sm text-ink-2">{t('empty')}</p>}
        {classes.map((klass) => (
          <Link
            key={klass.id}
            href={`/reports/${klass.id}`}
            className="rounded-md border border-line px-4 py-3 text-sm font-medium text-ink hover:border-accent"
          >
            {klass.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
