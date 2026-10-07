'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { GenerateQuestionsDialog } from './generate-questions-dialog';

import type { CurriculumOutcomeRow, CurriculumSubjectRow } from '@/features/bank/types';

import { Button } from '@/components/ui/button';

export function BankAiActions({
  outcomes,
  subjects,
  draftCount,
}: {
  readonly outcomes: readonly CurriculumOutcomeRow[];
  readonly subjects: readonly CurriculumSubjectRow[];
  readonly draftCount: number;
}) {
  const t = useTranslations('ai');

  return (
    <div className="flex items-center gap-2">
      <GenerateQuestionsDialog outcomes={outcomes} subjects={subjects} />
      <Button asChild variant="secondary">
        <Link href="/bank/review">
          {t('tray.title')}
          {draftCount > 0 ? ` (${draftCount})` : ''}
        </Link>
      </Button>
    </div>
  );
}
