import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { PageHeader } from '@/components/patterns/page-header';
import { getClassRoster } from '@/features/classes/actions.server';
import { getUnmatchedResults } from '@/features/results-linking/actions.server';
import { LinkResultsClient } from '@/features/results-linking/components/link-results-client';

export default async function LinkResultsPage({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [roster, results, t] = await Promise.all([
    getClassRoster(id),
    getUnmatchedResults(id),
    getTranslations('classes.linkResults'),
  ]);
  if (!roster) notFound();

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={roster.className} description={t('pageDescription')} />
      <div className="p-4">
        <LinkResultsClient
          students={roster.students}
          examAttempts={results.examAttempts}
          omrScans={results.omrScans}
        />
      </div>
    </div>
  );
}
