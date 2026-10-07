'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState, useTransition } from 'react';

import { MAX_AI_QUESTIONS_PER_CALL, type AiQuestionType } from '@testcim/shared';

import { aiErrorText } from './ai-error';

import type { CurriculumOutcomeRow, CurriculumSubjectRow } from '@/features/bank/types';

import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  generateQuestions,
  getAiCreditsInfo,
  type AiCreditsInfo,
} from '@/features/ai/question-actions.server';

const NO_OUTCOME = '__none__';
const GRADES = Array.from({ length: 12 }, (_, index) => index + 1);
const TYPES: readonly AiQuestionType[] = ['mcq', 'tf', 'open'];
const DIFFICULTIES = [1, 2, 3, 4, 5] as const;
const OPTION_COUNTS = [3, 4, 5] as const;

export interface GenerateQuestionsDialogProps {
  readonly outcomes: readonly CurriculumOutcomeRow[];
  readonly subjects: readonly CurriculumSubjectRow[];
  readonly onGenerated?: () => void;
}

export function GenerateQuestionsDialog({
  outcomes,
  subjects,
  onGenerated,
}: GenerateQuestionsDialogProps) {
  const t = useTranslations('ai');
  const tBank = useTranslations('bank');
  const [open, setOpen] = useState(false);
  const [credits, setCredits] = useState<AiCreditsInfo | null>(null);
  const [outcomeId, setOutcomeId] = useState<string>(NO_OUTCOME);
  const [topic, setTopic] = useState('');
  const [grade, setGrade] = useState(8);
  const [difficulty, setDifficulty] = useState(3);
  const [count, setCount] = useState(5);
  const [questionType, setQuestionType] = useState<AiQuestionType>('mcq');
  const [optionCount, setOptionCount] = useState(4);
  const [style, setStyle] = useState('');
  const [notice, setNotice] = useState<{ tone: 'ok' | 'err' | 'warn'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    void getAiCreditsInfo().then(setCredits);
  }, [open]);

  const subjectNameById = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject.name])),
    [subjects],
  );

  const outcomeOptions = useMemo(
    () => [
      { value: NO_OUTCOME, label: t('generate.outcomeNone') },
      ...outcomes.map((outcome) => {
        const subject = subjectNameById.get(outcome.subject_id);
        const code = outcome.code ? `${outcome.code} ` : '';
        return {
          value: outcome.id,
          label: `${subject ? `${subject}, ` : ''}${code}${outcome.description}`,
        };
      }),
    ],
    [outcomes, subjectNameById, t],
  );

  function handleOutcomeChange(value: string) {
    setOutcomeId(value);
    const outcome = outcomes.find((candidate) => candidate.id === value);
    if (outcome?.grade) setGrade(outcome.grade);
  }

  const cost = (credits?.costs.generateQuestions ?? 1) * count;
  const hasSubject = outcomeId !== NO_OUTCOME || topic.trim().length > 0;
  const locked = credits !== null && !credits.enabled;
  const canSubmit = hasSubject && !locked && count >= 1 && count <= MAX_AI_QUESTIONS_PER_CALL;

  function handleSubmit() {
    setNotice(null);
    startTransition(async () => {
      const result = await generateQuestions({
        ...(outcomeId !== NO_OUTCOME ? { outcomeId } : {}),
        ...(topic.trim() ? { topic: topic.trim() } : {}),
        grade,
        difficulty,
        count,
        questionType,
        optionCount,
        ...(style.trim() ? { style: style.trim() } : {}),
      });

      if (!result.ok) {
        setNotice({ tone: 'err', text: aiErrorText(t, result.reason) });
        return;
      }

      setCredits((current) => (current ? { ...current, balance: result.balance } : current));
      setNotice(
        result.created < result.requested
          ? {
              tone: 'warn',
              text: t('generate.partial', { created: result.created, requested: result.requested }),
            }
          : {
              tone: 'ok',
              text: t('generate.success', {
                created: result.created,
                credits: result.creditsCharged,
              }),
            },
      );
      onGenerated?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">{t('generate.open')}</Button>
      </DialogTrigger>
      <DialogContent
        title={t('generate.title')}
        description={t('generate.description')}
        closeLabel={t('generate.close')}
      >
        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          {locked && <InlineNotice tone="warn">{t('generate.locked')}</InlineNotice>}

          <FormField label={t('generate.outcome')}>
            {() => (
              <Combobox
                options={outcomeOptions}
                value={outcomeId}
                onValueChange={handleOutcomeChange}
                placeholder={t('generate.outcomePlaceholder')}
                searchPlaceholder={t('generate.outcomeSearch')}
                emptyMessage={t('generate.outcomeEmpty')}
              />
            )}
          </FormField>

          <FormField label={t('generate.topic')} hint={t('generate.topicHint')}>
            {(field) => (
              <Input
                {...field}
                value={topic}
                maxLength={200}
                onChange={(event) => setTopic(event.target.value)}
              />
            )}
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label={t('generate.grade')}>
              {(field) => (
                <Select value={String(grade)} onValueChange={(value) => setGrade(Number(value))}>
                  <SelectTrigger id={field.id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {t('generate.gradeOption', { grade: value })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>

            <FormField label={t('generate.difficulty')}>
              {(field) => (
                <Select
                  value={String(difficulty)}
                  onValueChange={(value) => setDifficulty(Number(value))}
                >
                  <SelectTrigger id={field.id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {t(`generate.difficultyOption.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>

            <FormField label={t('generate.type')}>
              {(field) => (
                <Select
                  value={questionType}
                  onValueChange={(value) => setQuestionType(value as AiQuestionType)}
                >
                  <SelectTrigger id={field.id}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {tBank(`filters.types.${value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FormField>

            <FormField label={t('generate.count')}>
              {(field) => (
                <Input
                  {...field}
                  type="number"
                  min={1}
                  max={MAX_AI_QUESTIONS_PER_CALL}
                  value={count}
                  onChange={(event) =>
                    setCount(
                      Math.min(
                        MAX_AI_QUESTIONS_PER_CALL,
                        Math.max(1, Number(event.target.value) || 1),
                      ),
                    )
                  }
                />
              )}
            </FormField>

            {questionType === 'mcq' && (
              <FormField label={t('generate.optionCount')}>
                {(field) => (
                  <Select
                    value={String(optionCount)}
                    onValueChange={(value) => setOptionCount(Number(value))}
                  >
                    <SelectTrigger id={field.id}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPTION_COUNTS.map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </FormField>
            )}
          </div>

          <FormField label={t('generate.style')} hint={t('generate.styleHint')}>
            {(field) => (
              <Input
                {...field}
                value={style}
                maxLength={120}
                onChange={(event) => setStyle(event.target.value)}
              />
            )}
          </FormField>

          {notice && (
            <InlineNotice tone={notice.tone}>
              <span>{notice.text}</span>{' '}
              {notice.tone !== 'err' && (
                <Link href="/bank/review" className="font-medium underline">
                  {t('generate.openTray')}
                </Link>
              )}
            </InlineNotice>
          )}
        </div>

        <DialogFooter>
          <div className="mr-auto text-sm text-ink-2">
            <p>{t('generate.cost', { credits: cost })}</p>
            {credits && <p>{t('generate.balance', { balance: credits.balance })}</p>}
          </div>
          <Button loading={pending} disabled={!canSubmit} onClick={handleSubmit}>
            {pending ? t('generate.submitting') : t('generate.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
