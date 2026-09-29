'use client';

import { useTranslations } from 'next-intl';

import type { BankQuestionRow } from './actions.server';

import { Checkbox } from '@/components/ui/checkbox';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';

export interface QuestionGridProps {
  readonly questions: readonly BankQuestionRow[];
  readonly selectedIds: ReadonlySet<string>;
  readonly onSelectedIdsChange: (ids: ReadonlySet<string>) => void;
  readonly activeId: string | null;
  readonly onActivate: (id: string) => void;
  readonly existingInTestIds?: ReadonlySet<string>;
}

export function QuestionGrid({
  questions,
  selectedIds,
  onSelectedIdsChange,
  activeId,
  onActivate,
  existingInTestIds,
}: QuestionGridProps) {
  const t = useTranslations('bank');

  if (questions.length === 0) {
    return <EmptyState message={t('list.empty')} />;
  }

  function toggle(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedIdsChange(next);
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
      {questions.map((q) => {
        const isSelected = selectedIds.has(q.id);
        const isActive = activeId === q.id;
        const isInTest = existingInTestIds?.has(q.id) ?? false;
        return (
          <button
            key={q.id}
            type="button"
            onClick={() => onActivate(q.id)}
            className={cn(
              'group relative aspect-[4/3] overflow-hidden rounded-panel border text-left',
              isActive ? 'border-accent' : 'border-line hover:border-line-strong',
            )}
          >
            <span
              className="absolute top-2 left-2 z-10"
              onClick={(e) => {
                e.stopPropagation();
                toggle(q.id);
              }}
            >
              <Checkbox checked={isSelected} aria-label={t('list.selectRow')} />
            </span>
            {isInTest && (
              <span className="absolute top-2 right-2 z-10 rounded-control bg-surface/90 px-2 py-0.5 text-xs text-ink-2">
                {t('list.alreadyInTest')}
              </span>
            )}
            {q.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={q.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-canvas px-3 text-center">
                <Icon name="file-text" size={24} className="text-ink-3" />
                <span className="line-clamp-3 text-xs text-ink-2">
                  {q.stem_text || t('list.noPreview')}
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
