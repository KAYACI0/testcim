'use client';

import { useTranslations } from 'next-intl';
import { useStore } from 'zustand';

import { resolveHeaderSettings } from '@testcim/shared';

import type { EditorStore } from '@/features/editor/store';
import type { EditorItem } from '@/features/editor/types';

import { Icon } from '@/components/ui/icon';
import { sortByPosition } from '@/features/editor/op-log';
import { cn } from '@/lib/cn';

export interface PaperPreviewProps {
  readonly store: EditorStore;
  readonly onEditTemplate?: () => void;
}

const SPACING_CLASSES = {
  tight: 'mb-4 pb-2',
  normal: 'mb-8 pb-4',
  wide: 'mb-12 pb-6',
  detailed: 'mb-20 pb-8',
} as const;

export function PaperPreview({ store, onEditTemplate }: PaperPreviewProps) {
  const items = useStore(store, (s) => s.items);
  const title = useStore(store, (s) => s.title);
  const settings = useStore(store, (s) => s.settings);
  const selectedItemId = useStore(store, (s) => s.selectedItemId);

  const t = useTranslations('editor.preview');
  const ready = sortByPosition(items).filter((item) => item.status !== 'error');

  const header = resolveHeaderSettings(settings?.header, title);
  const columns = settings?.columns ?? 2;
  const spacingClass =
    SPACING_CLASSES[header.questionSpacing ?? 'normal'] ?? SPACING_CLASSES.normal;

  const renderQuestion = (item: EditorItem, displayIndex: number) => {
    const isSelected = selectedItemId === item.id;

    return (
      <div
        key={item.id}
        onClick={() => store.getState().select(item.id)}
        className={cn(
          'group relative flex cursor-pointer flex-col rounded-[2px] p-2 transition-colors',
          spacingClass,
          isSelected ? 'bg-accent-tint/10 ring-1 ring-accent' : 'hover:bg-canvas/50',
        )}
      >
        <div className="flex items-start gap-2.5">
          <span className="shrink-0 text-sm font-bold text-ink tabular-nums">
            {displayIndex + 1}.
          </span>
          <div className="min-w-0 flex-1">
            {item.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed thumbnail URL
              <img
                src={item.thumbnailUrl}
                alt=""
                className="w-full rounded-[2px] object-contain select-none"
                loading="lazy"
              />
            ) : (
              <div className="h-28 w-full animate-pulse rounded-thumb bg-canvas" />
            )}
          </div>
          {item.points && (
            <span className="shrink-0 text-xs text-ink-3">
              ({item.points} {t('pointsSuffix')})
            </span>
          )}
        </div>
      </div>
    );
  };

  const mid = Math.ceil(ready.length / 2);
  const col1 = ready.slice(0, mid);
  const col2 = ready.slice(mid);

  return (
    <div className="h-full overflow-y-auto bg-canvas p-4 sm:p-8">
      {/* Printable A4 Paper Sheet */}
      <div className="mx-auto flex min-h-[1050px] w-full max-w-4xl flex-col rounded-paper border border-line bg-surface p-8 shadow-[0_1px_3px_rgb(20_28_45_/_0.12)] sm:p-12 print:border-none print:p-0 print:shadow-none">
        {/* Header Template */}
        <header className="relative mb-6 border-b-2 border-line-strong pb-4">
          {onEditTemplate && (
            <div className="absolute top-0 right-0 print:hidden">
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

          {header.layoutPreset === 'minimal' ? (
            /* Minimalist Preset: Direct Student Info Header */
            <div className="pt-1">
              {header.showStudentInfo !== false && (
                <div className="flex items-center justify-between text-xs text-ink">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink-2">{t('studentName')}:</span>
                    <span className="inline-block w-40 border-b border-dotted border-line-strong sm:w-56" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink-2">{t('classAndNo')}:</span>
                    <span className="inline-block w-28 border-b border-dotted border-line-strong sm:w-40" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink-2">{t('score')}:</span>
                    <span className="inline-block w-16 border-b border-dotted border-line-strong sm:w-24" />
                  </div>
                </div>
              )}
            </div>
          ) : header.layoutPreset === 'modern' ? (
            /* Modern Preset: Asymmetric Left-Right Header */
            <div>
              <div className="flex items-start justify-between gap-4 px-2">
                <div>
                  <h2 className="text-base font-bold text-ink">
                    {header.schoolName || t('defaultSchool')}
                  </h2>
                  <p className="mt-0.5 text-xs font-medium text-ink-2">
                    {[
                      header.subject ? `${header.subject} Dersi` : t('defaultSubject'),
                      header.className ? `${header.className} Sınıfı` : t('defaultClass'),
                      header.title || title || t('defaultTitle'),
                    ]
                      .filter(Boolean)
                      .join(' - ')}
                  </p>
                </div>
                <div className="text-right text-xs text-ink-3">
                  {header.teacherName && (
                    <p>
                      <strong className="font-medium text-ink-2">{t('teacher')}:</strong>{' '}
                      {header.teacherName}
                    </p>
                  )}
                  {header.duration && (
                    <p>
                      <strong className="font-medium text-ink-2">{t('duration')}:</strong>{' '}
                      {header.duration} dk
                    </p>
                  )}
                </div>
              </div>

              {header.showStudentInfo !== false && (
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-ink">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink-2">{t('studentName')}:</span>
                    <span className="inline-block w-40 border-b border-dotted border-line-strong sm:w-56" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink-2">{t('classAndNo')}:</span>
                    <span className="inline-block w-28 border-b border-dotted border-line-strong sm:w-40" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink-2">{t('score')}:</span>
                    <span className="inline-block w-16 border-b border-dotted border-line-strong sm:w-24" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Classic Preset: Formal Centered Test Header */
            <div>
              <div className="px-6 text-center">
                <h2 className="text-base font-bold text-ink sm:text-lg">
                  {header.schoolName || t('defaultSchool')}
                </h2>
                <p className="mt-0.5 text-xs font-medium text-ink-2">
                  {[
                    header.term || t('defaultTerm'),
                    header.subject ? `${header.subject} Dersi` : t('defaultSubject'),
                    header.className ? `${header.className} Sınıfı` : t('defaultClass'),
                    header.title || title || t('defaultTitle'),
                  ]
                    .filter(Boolean)
                    .join(' - ')}
                </p>
                {(header.teacherName || header.duration) && (
                  <div className="mt-1.5 flex items-center justify-center gap-6 text-xs text-ink-3">
                    {header.teacherName && (
                      <span>
                        <strong className="font-medium text-ink-2">{t('teacher')}:</strong>{' '}
                        {header.teacherName}
                      </span>
                    )}
                    {header.duration && (
                      <span>
                        <strong className="font-medium text-ink-2">{t('duration')}:</strong>{' '}
                        {header.duration} dk
                      </span>
                    )}
                  </div>
                )}
              </div>

              {header.showStudentInfo !== false && (
                <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs text-ink">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink-2">{t('studentName')}:</span>
                    <span className="inline-block w-40 border-b border-dotted border-line-strong sm:w-56" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink-2">{t('classAndNo')}:</span>
                    <span className="inline-block w-28 border-b border-dotted border-line-strong sm:w-40" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink-2">{t('score')}:</span>
                    <span className="inline-block w-16 border-b border-dotted border-line-strong sm:w-24" />
                  </div>
                </div>
              )}
            </div>
          )}

          {header.instructions && (
            <p className="mt-2.5 text-center text-xs text-ink-3 italic">{header.instructions}</p>
          )}
        </header>

        {/* Questions Body */}
        {ready.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-control border border-dashed border-line-strong px-6 py-24 text-center">
            <Icon name="exam" size={36} className="text-ink-3" />
            <p className="mt-3 text-sm font-semibold text-ink">{t('emptyQuestionsTitle')}</p>
            <p className="mt-1 text-xs text-ink-2">{t('emptyQuestionsHint')}</p>
          </div>
        ) : columns === 2 ? (
          <div className="relative grid flex-1 grid-cols-2 gap-x-8">
            {header.showColumnDivider !== false && (
              <div
                className="absolute top-0 bottom-0 left-1/2 -ml-px w-px bg-line"
                aria-hidden="true"
              />
            )}
            <div className="flex flex-col">
              {col1.map((item, index) => renderQuestion(item, index))}
            </div>
            <div className="flex flex-col">
              {col2.map((item, index) => renderQuestion(item, mid + index))}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            {ready.map((item, index) => renderQuestion(item, index))}
          </div>
        )}

        {/* Optional Optical Answer Sheet Page Section */}
        {header.showAnswerSheet && ready.length > 0 && (
          <div className="mt-8 border-t-2 border-line-strong pt-4">
            <h4 className="mb-3 text-center text-xs font-bold text-ink">{t('answerSheetTitle')}</h4>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              {ready.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-center gap-1.5 py-0.5">
                  <span className="w-5 text-right font-medium text-ink tabular-nums">
                    {idx + 1}.
                  </span>
                  {(['A', 'B', 'C', 'D', 'E'] as const).map((opt) => (
                    <span
                      key={opt}
                      className="inline-flex h-5 w-5 items-center justify-center rounded-control border border-line-strong text-[10px] font-bold text-ink"
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional Answer Key Section */}
        {header.showAnswerKey && ready.length > 0 && (
          <div className="mt-6 border-t border-line pt-3">
            <h4 className="mb-2 text-center text-xs font-bold text-ink">{t('answerKeyTitle')}</h4>
            <div className="flex flex-wrap justify-center gap-3 text-xs">
              {ready.map((item, idx) => {
                const ans =
                  item.correct && 'choice' in item.correct ? String(item.correct.choice) : '-';
                return (
                  <span
                    key={item.id}
                    className="inline-flex items-center gap-1 rounded-[2px] border border-line px-2 py-0.5 font-medium text-ink tabular-nums"
                  >
                    <strong>{idx + 1}.</strong> {ans}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
