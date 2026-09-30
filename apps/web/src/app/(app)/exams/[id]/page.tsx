import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { ResultsClient } from './results-client';

import { getExamResults } from '@/features/online-exam/actions.server';

export default async function ExamResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const results = await getExamResults(id);
  const t = await getTranslations('exams.results');

  if (!results.ok) {
    notFound();
  }

  return <ResultsClient examId={id} title={t('title')} data={results} />;
}
