import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { RosterClient } from './roster-client';

import { PageHeader } from '@/components/patterns/page-header';
import { getClassRoster } from '@/features/classes/actions.server';

export default async function ClassRosterPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [roster, t] = await Promise.all([getClassRoster(id), getTranslations('classes.roster')]);
  if (!roster) notFound();

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={roster.className} description={t('studentsTitle')} />
      <div className="p-4">
        <RosterClient
          classId={id}
          students={roster.students}
          retentionUntil={roster.retentionUntil}
        />
      </div>
    </div>
  );
}
