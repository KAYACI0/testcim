'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { OpenGradingQuestion } from './actions.server';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { regradeOpenAnswer } from '@/features/online-exam/actions.server';

function GradingRow({
  itemId,
  attemptId,
  studentLabel,
  answerText,
  currentPoints,
  maxPoints,
}: {
  readonly itemId: string;
  readonly attemptId: string;
  readonly studentLabel: string;
  readonly answerText: string;
  readonly currentPoints: number | null;
  readonly maxPoints: number;
}) {
  const t = useTranslations('exams.results.openGrading');
  const [points, setPoints] = useState(currentPoints !== null ? String(currentPoints) : '');
  const [saved, setSaved] = useState(currentPoints !== null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const parsed = Number(points);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > maxPoints) return;
    setSaving(true);
    const result = await regradeOpenAnswer({ attemptId, itemId, points: parsed });
    setSaving(false);
    setSaved(result.ok);
  }

  return (
    <div className="flex flex-col gap-2 border-b border-line py-3 last:border-b-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-ink">{studentLabel}</span>
          {saved ? (
            <Badge tone="ok">{t('graded')}</Badge>
          ) : (
            <Badge tone="warn">{t('ungraded')}</Badge>
          )}
        </div>
        <p className="mt-1 text-sm whitespace-pre-wrap text-ink-2">
          {answerText || t('blankAnswer')}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={maxPoints}
          step="0.5"
          value={points}
          onChange={(e) => {
            setPoints(e.target.value);
            setSaved(false);
          }}
          className="w-20"
          aria-label={t('pointsFor', { student: studentLabel })}
        />
        <span className="text-sm text-ink-3">/ {maxPoints}</span>
        <Button size="sm" variant="secondary" disabled={saving} onClick={() => void handleSave()}>
          {t('save')}
        </Button>
      </div>
    </div>
  );
}

export function OpenGradingPanel({
  questions,
}: {
  readonly questions: readonly OpenGradingQuestion[];
}) {
  const t = useTranslations('exams.results.openGrading');

  if (questions.length === 0) return null;

  return (
    <div className="flex flex-col gap-6 p-4">
      {questions.map((question, index) => (
        <div key={question.itemId} className="rounded-panel border border-line p-4">
          <p className="text-sm font-medium text-ink">
            {t('questionLabel', { index: index + 1 })}
            {question.stemText ? `: ${question.stemText}` : ''}
          </p>
          {question.rubric && <p className="mt-1 text-sm text-ink-3">{question.rubric}</p>}
          {question.rows.length === 0 ? (
            <p className="mt-2 text-sm text-ink-3">{t('noAnswers')}</p>
          ) : (
            <div className="mt-2">
              {question.rows.map((row) => (
                <GradingRow
                  key={row.attemptId}
                  itemId={question.itemId}
                  attemptId={row.attemptId}
                  studentLabel={row.studentLabel}
                  answerText={row.answerText}
                  currentPoints={row.currentPoints}
                  maxPoints={question.maxPoints}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
