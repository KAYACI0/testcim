'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { seededShuffle } from '@testcim/shared';

import { Segmented } from '@/components/ui/segmented';

const BOOKLETS = ['A', 'B', 'C', 'D'] as const;
type Booklet = (typeof BOOKLETS)[number];

/** Runs the same deterministic shuffle the product uses, on a small sample, in the browser. */
export function BookletDemo() {
  const t = useTranslations('marketing.features.bookletDemo');
  const [booklet, setBooklet] = useState<Booklet>('A');
  const questions = [1, 2, 3, 4, 5].map((n) => ({ n, text: t(`questions.${n}`) }));
  const ordered = booklet === 'A' ? questions : seededShuffle(questions, `demo-${booklet}`);

  return (
    <div className="flex flex-col gap-3" data-testid="booklet-demo">
      <Segmented
        aria-label={t('label')}
        value={booklet}
        onValueChange={(next) => setBooklet(BOOKLETS.find((value) => value === next) ?? 'A')}
        options={BOOKLETS.map((value) => ({ value, label: t('booklet', { name: value }) }))}
      />
      <ol className="flex max-w-md flex-col divide-y divide-line border-y border-line text-sm">
        {ordered.map((question, index) => (
          <li key={question.n} className="flex gap-3 py-2">
            <span className="text-ink-2 tabular-nums">{index + 1}.</span>
            <span className="text-ink">{question.text}</span>
            <span className="ml-auto text-ink-2">
              {t('originalNumber', { number: question.n })}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
