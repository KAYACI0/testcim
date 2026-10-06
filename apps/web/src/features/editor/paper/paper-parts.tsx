'use client';

import { useTranslations } from 'next-intl';

import type { TestHeaderSettings } from '@testcim/shared';

import { COLUMN_GAP, PAGE_HEIGHT, PAGE_PADDING, PAGE_WIDTH, type PaperPage } from './paginate';

import type { EditorItem } from '@/features/editor/types';
import type { ReactNode } from 'react';

import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';

export type QuestionSpacing = NonNullable<TestHeaderSettings['questionSpacing']>;

/** Bottom padding lives inside the block so a measured height includes the gap. */
const SPACING_CLASSES: Record<QuestionSpacing, string> = {
  tight: 'pb-2',
  normal: 'pb-5',
  wide: 'pb-8',
  detailed: 'pb-16',
};

export type ExtraPageKind = 'answerSheet' | 'answerKey';

export interface PaperModel {
  readonly ready: readonly EditorItem[];
  readonly pages: readonly PaperPage[];
  readonly extras: readonly ExtraPageKind[];
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

function answerLetter(item: EditorItem): string {
  return item.correct?.question_type === 'mcq' ? item.correct.option_id : '-';
}

function useMetaLine(header: TestHeaderSettings, title: string, withTerm: boolean): string {
  const t = useTranslations('editor.preview');
  return [
    withTerm ? header.term || t('defaultTerm') : '',
    header.subject ? t('subjectLine', { subject: header.subject }) : t('defaultSubject'),
    header.className ? t('classLine', { class: header.className }) : t('defaultClass'),
    header.title || title || t('defaultTitle'),
  ]
    .filter(Boolean)
    .join(' - ');
}

function StudentInfoRow({ plain = false }: { readonly plain?: boolean }) {
  const t = useTranslations('editor.preview');
  return (
    <div
      className={cn(
        'flex items-center justify-between text-xs text-ink',
        !plain && 'mt-4 border-t border-line pt-3',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold text-ink-2">{t('studentName')}:</span>
        <span className="inline-block w-56 border-b border-dotted border-line-strong" />
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-ink-2">{t('classAndNo')}:</span>
        <span className="inline-block w-28 border-b border-dotted border-line-strong" />
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-ink-2">{t('score')}:</span>
        <span className="inline-block w-20 border-b border-dotted border-line-strong" />
      </div>
    </div>
  );
}

function TeacherDuration({
  header,
  className,
}: {
  readonly header: TestHeaderSettings;
  readonly className: string;
}) {
  const t = useTranslations('editor.preview');
  return (
    <>
      {header.teacherName && (
        <span className={className}>
          <strong className="font-medium text-ink-2">{t('teacher')}:</strong> {header.teacherName}
        </span>
      )}
      {header.duration && (
        <span className={className}>
          <strong className="font-medium text-ink-2">{t('duration')}:</strong>{' '}
          {t('durationMinutes', { min: header.duration })}
        </span>
      )}
    </>
  );
}

/** Full exam header, shown on page 1 only. */
export function FirstPageHeader({
  header,
  title,
  onEditTemplate,
}: {
  readonly header: TestHeaderSettings;
  readonly title: string;
  readonly onEditTemplate?: (() => void) | undefined;
}) {
  const t = useTranslations('editor.preview');
  const classicLine = useMetaLine(header, title, true);
  const modernLine = useMetaLine(header, title, false);
  const showStudent = header.showStudentInfo !== false;

  return (
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

      {header.layoutPreset === 'minimal' ? (
        <div className="pt-1">{showStudent && <StudentInfoRow plain />}</div>
      ) : header.layoutPreset === 'modern' ? (
        <div>
          <div className="flex items-start justify-between gap-4 px-2">
            <div>
              <h2 className="text-base font-bold text-ink">
                {header.schoolName || t('defaultSchool')}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-ink-2">{modernLine}</p>
            </div>
            <div className="text-right text-xs text-ink-3">
              <TeacherDuration header={header} className="block" />
            </div>
          </div>
          {showStudent && <StudentInfoRow />}
        </div>
      ) : (
        <div>
          <div className="px-6 text-center">
            <h2 className="text-lg font-bold text-ink">
              {header.schoolName || t('defaultSchool')}
            </h2>
            <p className="mt-0.5 text-xs font-medium text-ink-2">{classicLine}</p>
            {(header.teacherName || header.duration) && (
              <div className="mt-1.5 flex items-center justify-center gap-6 text-xs text-ink-3">
                <TeacherDuration header={header} className="" />
              </div>
            )}
          </div>
          {showStudent && <StudentInfoRow />}
        </div>
      )}

      {header.instructions && (
        <p className="mt-2.5 text-center text-xs text-ink-3 italic">{header.instructions}</p>
      )}
    </header>
  );
}

/** Slim header for every page after the first. */
export function CompactHeader({
  header,
  title,
  pageNumber,
  totalPages,
}: {
  readonly header: TestHeaderSettings;
  readonly title: string;
  readonly pageNumber: number;
  readonly totalPages: number;
}) {
  const t = useTranslations('editor.preview');
  const meta = [header.subject, header.className, header.title || title]
    .filter(Boolean)
    .join(' - ');

  return (
    <header className="flex items-center justify-between gap-4 border-b border-line pb-2.5 text-xs">
      <div className="flex min-w-0 items-baseline gap-3 text-ink-2">
        <span className="shrink-0 font-bold text-ink">
          {header.schoolName || t('defaultSchool')}
        </span>
        <span className="truncate">{meta}</span>
      </div>
      <div className="shrink-0 font-medium text-ink-2 tabular-nums">
        {t('pageNumber', { current: pageNumber, total: totalPages })}
      </div>
    </header>
  );
}

export function PageFooter({
  pageNumber,
  totalPages,
}: {
  readonly pageNumber: number;
  readonly totalPages: number;
}) {
  const t = useTranslations('editor.preview');
  return (
    <footer className="flex items-center justify-between border-t border-line pt-3 text-[10px] text-ink-3">
      <span>{t('footerBrand')}</span>
      <span className="tabular-nums">
        {t('pageNumber', { current: pageNumber, total: totalPages })}
      </span>
    </footer>
  );
}

export function QuestionBlock({
  item,
  number,
  spacing,
  selected = false,
  onSelect,
  eager = false,
}: {
  readonly item: EditorItem;
  readonly number: number;
  readonly spacing: QuestionSpacing;
  readonly selected?: boolean;
  readonly onSelect?: (() => void) | undefined;
  /** Print and measuring copies load images immediately instead of lazily. */
  readonly eager?: boolean;
}) {
  const t = useTranslations('editor.preview');

  return (
    <div
      onClick={onSelect}
      className={cn(
        'flex flex-col rounded-[2px] px-2 pt-2 transition-colors',
        SPACING_CLASSES[spacing],
        onSelect && 'cursor-pointer',
        selected ? 'bg-accent-tint/10 ring-1 ring-accent' : onSelect && 'hover:bg-canvas/50',
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="shrink-0 text-sm font-bold text-ink tabular-nums">{number}.</span>
        <div className="min-w-0 flex-1">
          {item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed thumbnail URL
            <img
              src={item.thumbnailUrl}
              alt=""
              loading={eager ? 'eager' : 'lazy'}
              className="block w-full rounded-[2px] object-contain select-none"
            />
          ) : (
            <div className="h-28 w-full rounded-thumb bg-canvas" />
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
}

export function PaperSheet({
  children,
  bare = false,
}: {
  readonly children: ReactNode;
  /** Print and export copies drop the on-screen border and shadow. */
  readonly bare?: boolean;
}) {
  return (
    <section
      data-paper-sheet=""
      style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, padding: PAGE_PADDING }}
      className={cn(
        'relative flex shrink-0 flex-col overflow-hidden bg-surface',
        !bare && 'rounded-paper border border-line shadow-[0_1px_3px_rgb(20_28_45_/_0.12)]',
      )}
    >
      {children}
    </section>
  );
}

function AnswerSheetPage({ ready }: { readonly ready: readonly EditorItem[] }) {
  const t = useTranslations('editor.preview');
  return (
    <div>
      <h4 className="mb-4 text-center text-sm font-bold text-ink">{t('answerSheetTitle')}</h4>
      <div className="grid grid-cols-3 gap-x-6 gap-y-1.5 text-xs">
        {ready.map((item, index) => (
          <div key={item.id} className="flex items-center gap-1.5">
            <span className="w-6 text-right font-medium text-ink tabular-nums">{index + 1}.</span>
            {OPTION_LETTERS.map((letter) => (
              <span
                key={letter}
                className="inline-flex h-5 w-5 items-center justify-center rounded-control border border-line-strong text-[10px] font-bold text-ink"
              >
                {letter}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnswerKeyPage({ ready }: { readonly ready: readonly EditorItem[] }) {
  const t = useTranslations('editor.preview');
  return (
    <div>
      <h4 className="mb-4 text-center text-sm font-bold text-ink">{t('answerKeyTitle')}</h4>
      <div className="grid grid-cols-5 gap-2 text-sm">
        {ready.map((item, index) => (
          <span
            key={item.id}
            className="flex items-center justify-between rounded-[2px] border border-line px-3 py-1.5 font-medium text-ink tabular-nums"
          >
            <span className="text-ink-2">{index + 1}.</span>
            <strong>{answerLetter(item)}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Renders every A4 sheet of the paper from one pre-computed model. The same
 * component backs the on-screen preview, the print copy and the PDF export.
 */
export function PaperPages({
  model,
  header,
  title,
  columns,
  spacing,
  selectedItemId,
  onSelectItem,
  onEditTemplate,
  eager = false,
  bare = false,
}: {
  readonly model: PaperModel;
  readonly header: TestHeaderSettings;
  readonly title: string;
  readonly columns: 1 | 2;
  readonly spacing: QuestionSpacing;
  readonly selectedItemId?: string | null;
  readonly onSelectItem?: ((id: string) => void) | undefined;
  readonly onEditTemplate?: (() => void) | undefined;
  readonly eager?: boolean;
  readonly bare?: boolean;
}) {
  const t = useTranslations('editor.preview');
  const { ready, pages, extras } = model;
  const totalPages = pages.length + extras.length;
  const interactive = onSelectItem !== undefined;

  const badge = (pageNumber: number, label: string) =>
    interactive ? (
      <div className="flex items-center justify-between px-1 text-xs text-ink-3">
        <span className="font-semibold text-ink-2">
          {t('pageNumber', { current: pageNumber, total: totalPages })}
        </span>
        <span>{label}</span>
      </div>
    ) : null;

  const wrap = (key: string, badgeNode: ReactNode, sheet: ReactNode) => (
    <div key={key} className="flex flex-col gap-2" data-paper-wrap="">
      {badgeNode}
      {sheet}
    </div>
  );

  return (
    <>
      {pages.map((page, pageIndex) => {
        const pageNumber = pageIndex + 1;
        const count = page.columns.reduce((sum, column) => sum + column.length, 0);
        const label = count > 0 ? t('questionCount', { count }) : t('emptyQuestionsHint');

        return wrap(
          `page-${pageNumber}`,
          badge(pageNumber, label),
          <PaperSheet bare={bare}>
            {pageIndex === 0 ? (
              <FirstPageHeader header={header} title={title} onEditTemplate={onEditTemplate} />
            ) : (
              <CompactHeader
                header={header}
                title={title}
                pageNumber={pageNumber}
                totalPages={totalPages}
              />
            )}

            <div className="min-h-0 flex-1" style={{ paddingTop: 24 }}>
              {ready.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-control border border-dashed border-line-strong px-6 text-center">
                  <Icon name="exam" size={36} className="text-ink-3" />
                  <p className="mt-3 text-sm font-semibold text-ink">{t('emptyQuestionsTitle')}</p>
                  <p className="mt-1 text-xs text-ink-2">{t('emptyQuestionsHint')}</p>
                </div>
              ) : (
                <div
                  className="relative grid h-full"
                  style={{
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                    columnGap: COLUMN_GAP,
                  }}
                >
                  {columns === 2 && header.showColumnDivider !== false && (
                    <div
                      className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-line"
                      aria-hidden="true"
                    />
                  )}
                  {page.columns.map((column, columnIndex) => (
                    <div key={columnIndex} className="flex min-w-0 flex-col">
                      {column.map((itemIndex) => {
                        const item = ready[itemIndex] as EditorItem;
                        return (
                          <QuestionBlock
                            key={item.id}
                            item={item}
                            number={itemIndex + 1}
                            spacing={spacing}
                            selected={selectedItemId === item.id}
                            onSelect={onSelectItem ? () => onSelectItem(item.id) : undefined}
                            eager={eager}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <PageFooter pageNumber={pageNumber} totalPages={totalPages} />
          </PaperSheet>,
        );
      })}

      {extras.map((kind, extraIndex) => {
        const pageNumber = pages.length + extraIndex + 1;
        return wrap(
          `extra-${kind}`,
          badge(pageNumber, t(kind === 'answerKey' ? 'answerKeyTitle' : 'answerSheetTitle')),
          <PaperSheet bare={bare}>
            <CompactHeader
              header={header}
              title={title}
              pageNumber={pageNumber}
              totalPages={totalPages}
            />
            <div className="min-h-0 flex-1" data-extra-page={kind} style={{ paddingTop: 24 }}>
              {kind === 'answerKey' ? (
                <AnswerKeyPage ready={ready} />
              ) : (
                <AnswerSheetPage ready={ready} />
              )}
            </div>
            <PageFooter pageNumber={pageNumber} totalPages={totalPages} />
          </PaperSheet>,
        );
      })}
    </>
  );
}
