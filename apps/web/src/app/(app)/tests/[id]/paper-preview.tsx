'use client';

import { useTranslations } from 'next-intl';
import { useStore } from 'zustand';

import { resolveHeaderSettings } from '@testcim/shared';

import type { EditorStore } from '@/features/editor/store';

import { Icon } from '@/components/ui/icon';
import { sortByPosition } from '@/features/editor/op-log';
import { cn } from '@/lib/cn';

export interface PaperPreviewProps {
  readonly store: EditorStore;
  readonly onEditTemplate?: () => void;
}

export function PaperPreview({ store, onEditTemplate }: PaperPreviewProps) {
  const items = useStore(store, (s) => s.items);
  const title = useStore(store, (s) => s.title);
  const settings = useStore(store, (s) => s.settings);
  const selectedItemId = useStore(store, (s) => s.selectedItemId);

  const t = useTranslations('editor.preview');
  const ready = sortByPosition(items).filter((item) => item.status !== 'error');

  const header = resolveHeaderSettings(settings?.header, title);
  const columns = settings?.columns ?? 1;

  const showStudentBox =
    header.showStudentName ||
    header.showClass ||
    header.showStudentNo ||
    header.showDate ||
    header.showScore;

  return (
    <div className="h-full overflow-y-auto bg-canvas p-6 sm:p-8">
      {/* A4 Paper Sheet */}
      <div className="mx-auto flex max-w-3xl flex-col rounded-paper border border-line bg-surface p-8 shadow-[0_1px_3px_rgb(20_28_45_/_0.12)]">
        {/* Test Paper Header Template */}
        <header className="relative border-b-2 border-line-strong pb-4">
          {onEditTemplate && (
            <div className="absolute top-0 right-0">
              <button
                type="button"
                onClick={onEditTemplate}
                className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <Icon name="pencil-simple" size={14} />
                <span>{t('editTemplate')}</span>
              </button>
            </div>
          )}

          {/* School & Exam Title */}
          <div className="px-8 text-center">
            <h2 className="text-base font-semibold text-ink">
              {header.schoolName || t('defaultSchool')}
            </h2>
            <p className="mt-0.5 text-xs text-ink-2">
              {[header.term || t('defaultTerm'), header.subject || t('defaultSubject')]
                .filter(Boolean)
                .join(' - ')}
            </p>
            <h3 className="mt-1 text-sm font-semibold text-ink">
              {header.title || title || t('defaultTitle')}
            </h3>
          </div>

          {/* Booklet code badge if enabled */}
          {header.showBookletCode && (
            <div className="mt-2 flex justify-end">
              <div className="flex flex-col items-center justify-center rounded-[2px] border border-line-strong px-2.5 py-0.5 text-center">
                <span className="text-[10px] text-ink-2">{t('booklet')}</span>
                <span className="text-sm leading-none font-bold text-ink">
                  {header.bookletCode || 'A'}
                </span>
              </div>
            </div>
          )}

          {/* Student Info Box */}
          {showStudentBox && (
            <div className="mt-3 grid grid-cols-12 gap-3 rounded-[2px] border border-line-strong p-2.5 text-xs">
              <div
                className={`grid gap-x-4 gap-y-2 ${
                  header.showScore ? 'col-span-9 grid-cols-2' : 'col-span-12 grid-cols-2'
                }`}
              >
                {header.showStudentName && (
                  <div className="flex items-baseline gap-1.5">
                    <span className="shrink-0 font-medium text-ink">{t('studentName')}:</span>
                    <span className="min-w-[60px] flex-1 border-b border-dotted border-line-strong" />
                  </div>
                )}
                {header.showClass && (
                  <div className="flex items-baseline gap-1.5">
                    <span className="shrink-0 font-medium text-ink">{t('class')}:</span>
                    <span className="min-w-[60px] flex-1 border-b border-dotted border-line-strong" />
                  </div>
                )}
                {header.showStudentNo && (
                  <div className="flex items-baseline gap-1.5">
                    <span className="shrink-0 font-medium text-ink">{t('studentNo')}:</span>
                    <span className="min-w-[60px] flex-1 border-b border-dotted border-line-strong" />
                  </div>
                )}
                {header.showDate && (
                  <div className="flex items-baseline gap-1.5">
                    <span className="shrink-0 font-medium text-ink">{t('date')}:</span>
                    <span className="min-w-[60px] flex-1 border-b border-dotted border-line-strong" />
                  </div>
                )}
              </div>

              {header.showScore && (
                <div className="col-span-3 flex flex-col items-center justify-center border-l border-line pl-2">
                  <span className="text-[11px] font-medium text-ink-2">{t('score')}</span>
                  <div className="mt-1 h-7 w-14 rounded-[2px] border border-line-strong" />
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          {header.instructions && (
            <p className="mt-2 text-xs text-ink-2 italic">{header.instructions}</p>
          )}
        </header>

        {/* Questions Body */}
        {ready.length === 0 ? (
          <div className="mt-8 flex flex-col items-center justify-center rounded-control border border-dashed border-line-strong px-6 py-16 text-center">
            <Icon name="exam" size={32} className="text-ink-3" />
            <p className="mt-3 text-sm font-medium text-ink">{t('emptyQuestionsTitle')}</p>
            <p className="mt-1 text-xs text-ink-2">{t('emptyQuestionsHint')}</p>
          </div>
        ) : columns === 2 ? (
          <div className="relative mt-6 grid grid-cols-2 gap-x-8 gap-y-6">
            <div
              className="absolute top-0 bottom-0 left-1/2 -ml-px w-px bg-line"
              aria-hidden="true"
            />
            {ready.map((item, index) => (
              <div
                key={item.id}
                onClick={() => store.getState().select(item.id)}
                className={cn(
                  'flex cursor-pointer flex-col gap-2 rounded-[2px] border-b border-line p-2 pb-4 transition-colors',
                  selectedItemId === item.id ? 'ring-2 ring-accent' : 'hover:bg-canvas/50',
                )}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-ink tabular-nums">{index + 1}.</span>
                  {item.points && (
                    <span className="text-ink-3">
                      ({item.points} {t('pointsSuffix')})
                    </span>
                  )}
                </div>
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed thumbnail URL
                  <img src={item.thumbnailUrl} alt="" className="max-w-full rounded-[2px]" />
                ) : (
                  <div className="h-24 w-full animate-pulse rounded-thumb bg-canvas" />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-6">
            {ready.map((item, index) => (
              <div
                key={item.id}
                onClick={() => store.getState().select(item.id)}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-[2px] border-b border-line p-2 pb-4 transition-colors last:border-0',
                  selectedItemId === item.id ? 'ring-2 ring-accent' : 'hover:bg-canvas/50',
                )}
              >
                <span className="mt-1 text-sm font-semibold text-ink tabular-nums">
                  {index + 1}.
                </span>
                <div className="min-w-0 flex-1">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed thumbnail URL
                    <img src={item.thumbnailUrl} alt="" className="max-w-full rounded-[2px]" />
                  ) : (
                    <div className="h-24 w-full animate-pulse rounded-thumb bg-canvas" />
                  )}
                </div>
                {item.points && (
                  <span className="shrink-0 text-xs text-ink-3">
                    ({item.points} {t('pointsSuffix')})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
