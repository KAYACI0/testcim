'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';

import type { StoredQualityCheck } from '@testcim/shared';

import { getQuestionDetail, setQuestionOutcomes } from './actions.server';

import type { QuestionDetail, TagRow } from './actions.server';
import type { CurriculumOutcomeRow } from './types';

import { InspectorPanel } from '@/components/patterns/inspector-panel';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { QuestionAiActions } from '@/features/ai/components/question-ai-actions';

export interface InspectorContentProps {
  readonly questionId: string | null;
  readonly outcomes: readonly CurriculumOutcomeRow[];
  readonly onTagsChanged?: () => void;
}

function readStoredQuality(sourceMeta: Record<string, unknown>): StoredQualityCheck | null {
  const quality = sourceMeta.ai_quality as { issues?: unknown } | undefined;
  return Array.isArray(quality?.issues) ? (quality as unknown as StoredQualityCheck) : null;
}

export function InspectorContent({ questionId, outcomes, onTagsChanged }: InspectorContentProps) {
  const t = useTranslations('bank.inspector');
  const [detail, setDetail] = useState<QuestionDetail | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      if (!questionId) {
        setDetail(null);
        return;
      }
      const result = await getQuestionDetail(questionId);
      setDetail(result.ok ? result.detail : null);
    });
  }, [questionId]);

  if (!questionId) {
    return (
      <aside className="flex h-full w-full shrink-0 items-center justify-center border-l border-line p-6 text-sm text-ink-3 lg:w-72">
        {t('noSelection')}
      </aside>
    );
  }

  async function addOutcome(outcomeId: string) {
    if (!detail || !questionId) return;
    const nextIds = [...new Set([...detail.outcomeIds, outcomeId])];
    setDetail({ ...detail, outcomeIds: nextIds });
    await setQuestionOutcomes({ questionId, outcomeIds: nextIds });
    onTagsChanged?.();
  }

  async function removeOutcome(outcomeId: string) {
    if (!detail || !questionId) return;
    const nextIds = detail.outcomeIds.filter((id) => id !== outcomeId);
    setDetail({ ...detail, outcomeIds: nextIds });
    await setQuestionOutcomes({ questionId, outcomeIds: nextIds });
    onTagsChanged?.();
  }

  return (
    <InspectorPanel
      title={t('title')}
      defaultValue="preview"
      sections={[
        {
          value: 'preview',
          label: t('tabs.preview'),
          content:
            pending || !detail ? (
              <p className="py-4 text-sm text-ink-3">{t('loading')}</p>
            ) : (
              <div className="flex flex-col gap-3 py-4">
                {detail.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detail.thumbnailUrl}
                    alt=""
                    className="rounded-panel border border-line"
                  />
                ) : (
                  <p className="text-sm text-ink">{detail.stemText || t('noPreview')}</p>
                )}
                {detail.difficulty && (
                  <p className="text-xs text-ink-2">
                    {t('difficulty')}: {detail.difficulty}
                  </p>
                )}
              </div>
            ),
        },
        {
          value: 'tags',
          label: t('tabs.tags'),
          content:
            pending || !detail ? (
              <p className="py-4 text-sm text-ink-3">{t('loading')}</p>
            ) : (
              <div className="flex flex-col gap-4 py-4">
                <div>
                  <h3 className="mb-2 text-xs font-medium text-ink-2">{t('tagsLabel')}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.tags.length === 0 && (
                      <p className="text-xs text-ink-3">{t('noTags')}</p>
                    )}
                    {detail.tags.map((tag: TagRow) => (
                      <Badge key={tag.id}>{tag.name}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-xs font-medium text-ink-2">{t('outcomesLabel')}</h3>
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {detail.outcomeIds.length === 0 && (
                      <p className="text-xs text-ink-3">{t('noOutcomes')}</p>
                    )}
                    {detail.outcomeIds.map((id) => {
                      const outcome = outcomes.find((o) => o.id === id);
                      if (!outcome) return null;
                      return (
                        <Badge key={id} tone="accent">
                          <button type="button" onClick={() => void removeOutcome(id)}>
                            {outcome.code ?? outcome.description}
                          </button>
                        </Badge>
                      );
                    })}
                  </div>
                  <Combobox
                    options={outcomes
                      .filter((o) => !detail.outcomeIds.includes(o.id))
                      .map((o) => ({
                        value: o.id,
                        label: o.code ? `${o.code} ${o.description}` : o.description,
                      }))}
                    value={null}
                    onValueChange={(value) => void addOutcome(value)}
                    placeholder={t('addOutcomePlaceholder')}
                    searchPlaceholder={t('addOutcomePlaceholder')}
                    emptyMessage={t('noOutcomeMatches')}
                  />
                </div>
              </div>
            ),
        },
        {
          value: 'ai',
          label: t('tabs.ai'),
          content:
            pending || !detail ? (
              <p className="py-4 text-sm text-ink-3">{t('loading')}</p>
            ) : (
              <QuestionAiActions
                key={detail.id}
                questionId={detail.id}
                kind={detail.kind}
                questionType={detail.questionType}
                hasText={Boolean(detail.stemText)}
                initialQuality={readStoredQuality(detail.sourceMeta)}
              />
            ),
        },
        {
          value: 'usage',
          label: t('tabs.usage'),
          content:
            pending || !detail ? (
              <p className="py-4 text-sm text-ink-3">{t('loading')}</p>
            ) : (
              <ul className="flex flex-col gap-2 py-4 text-sm">
                {detail.usedInTests.length === 0 && <p className="text-ink-3">{t('noUsage')}</p>}
                {detail.usedInTests.map((usage) => (
                  <li key={usage.testId}>
                    <Link href={`/tests/${usage.testId}`} className="text-accent hover:underline">
                      {usage.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ),
        },
        {
          value: 'history',
          label: t('tabs.history'),
          content:
            pending || !detail ? (
              <p className="py-4 text-sm text-ink-3">{t('loading')}</p>
            ) : (
              <ul className="flex flex-col gap-2 py-4 text-sm">
                {detail.revisions.map((rev) => (
                  <li key={rev.revision} className="flex items-center justify-between">
                    <span
                      className={
                        rev.revision === detail.currentRevision
                          ? 'font-medium text-ink'
                          : 'text-ink-2'
                      }
                    >
                      {t('revisionLabel', { revision: rev.revision })}
                    </span>
                    <time className="text-xs text-ink-3">
                      {new Date(rev.createdAt).toLocaleDateString('tr-TR')}
                    </time>
                  </li>
                ))}
              </ul>
            ),
        },
      ]}
    />
  );
}
