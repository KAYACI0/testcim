'use client';

import { useMemo, type MouseEvent, type ReactNode } from 'react';

import { renderPaintHtml, type PaintPage } from '@testcim/renderers/paint';

import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';

export interface PaperViewLabels {
  readonly pageNumber: (page: number, total: number) => string;
  readonly questionCount: (count: number) => string;
  readonly answerSheetTitle: string;
  readonly answerKeyTitle: string;
  readonly editTemplate: string;
  readonly emptyTitle: string;
  readonly emptyHint: string;
}

export interface PaperViewProps {
  readonly pages: readonly PaintPage[];
  /** Image key (an item id) to its address. */
  readonly imageUrls: ReadonlyMap<string, string>;
  /** Questions on each question page, for the page badge. */
  readonly questionCounts: readonly number[];
  readonly labels: PaperViewLabels;
  readonly empty: boolean;
  /** The on-screen preview is interactive; the print copy is bare and static. */
  readonly interactive?: {
    readonly selectedKey: string | null;
    readonly onSelect: (key: string) => void;
    readonly onEditTemplate: () => void;
  };
}

/** Item ids are uuids; anything else is not worth putting in a selector. */
const SAFE_KEY = /^[\w-]+$/;

/**
 * Mounts the pages the paper layer drew. The HTML comes from `renderPaintHtml`, which
 * escapes all text and checks every image address, so it is safe to inject; the same
 * pages become the PDF, which is why this view has no layout logic of its own.
 */
export function PaperView({
  pages,
  imageUrls,
  questionCounts,
  labels,
  empty,
  interactive,
}: PaperViewProps) {
  const html = useMemo(
    () => renderPaintHtml(pages, { imageSrc: (key) => imageUrls.get(key) ?? null }),
    [pages, imageUrls],
  );

  const handleClick = (event: MouseEvent<HTMLElement>) => {
    if (!interactive) return;
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-paint-key]');
    const key = target?.dataset.paintKey;
    if (key) interactive.onSelect(key);
  };

  const selectedKey = interactive?.selectedKey;
  const selectionStyle =
    selectedKey && SAFE_KEY.test(selectedKey)
      ? `[data-paint-key="${selectedKey}"]{outline:2px solid var(--color-accent);outline-offset:3px;}`
      : null;

  const badge = (page: PaintPage, index: number): ReactNode => {
    if (!interactive) return null;
    const label =
      page.tag === 'answerKey'
        ? labels.answerKeyTitle
        : page.tag === 'answerSheet'
          ? labels.answerSheetTitle
          : (questionCounts[index] ?? 0) > 0
            ? labels.questionCount(questionCounts[index] ?? 0)
            : labels.emptyHint;
    return (
      <div className="flex items-center justify-between px-1 text-xs text-ink-3">
        <span className="font-semibold text-ink-2">
          {labels.pageNumber(index + 1, pages.length)}
        </span>
        <span>{label}</span>
      </div>
    );
  };

  return (
    <>
      {selectionStyle && <style>{selectionStyle}</style>}
      {pages.map((page, index) => (
        <div
          // The page list is positional and never reordered.

          key={index}
          data-paper-wrap=""
          data-extra-page={page.tag === 'questions' ? undefined : page.tag}
          className="flex flex-col gap-2"
        >
          {badge(page, index)}
          <div
            className={cn(
              'relative w-fit',
              interactive &&
                'overflow-hidden rounded-paper border border-line shadow-[0_1px_3px_rgb(20_28_45_/_0.12)]',
            )}
          >
            <div
              onClick={handleClick}
              // Trusted: produced by renderPaintHtml, which escapes text and allowlists image sources.

              dangerouslySetInnerHTML={{ __html: html[index] ?? '' }}
            />
            {interactive && index === 0 && (
              <button
                type="button"
                onClick={interactive.onEditTemplate}
                className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <Icon name="pencil-simple" size={14} />
                <span>{labels.editTemplate}</span>
              </button>
            )}
            {empty && index === 0 && (
              <div className="pointer-events-none absolute inset-x-[12mm] top-[110mm] bottom-[40mm] flex flex-col items-center justify-center rounded-control border border-dashed border-line-strong px-6 text-center">
                <Icon name="exam" size={36} className="text-ink-3" />
                <p className="mt-3 text-sm font-semibold text-ink">{labels.emptyTitle}</p>
                <p className="mt-1 text-xs text-ink-2">{labels.emptyHint}</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
