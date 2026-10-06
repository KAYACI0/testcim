'use client';

import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import type { TestHeaderSettings } from '@testcim/shared';

import {
  BODY_SAFETY,
  CONTENT_WIDTH,
  FOOTER_GAP,
  HEADER_GAP,
  PAGE_HEIGHT,
  PAGE_PADDING,
  columnWidth,
  paginate,
} from './paginate';
import {
  CompactHeader,
  FirstPageHeader,
  PageFooter,
  QuestionBlock,
  type ExtraPageKind,
  type PaperModel,
  type QuestionSpacing,
} from './paper-parts';

import type { EditorItem } from '@/features/editor/types';

/** Used until the first measurement lands, so the first paint is already close. */
const FALLBACK_QUESTION_HEIGHT = 160;
const FALLBACK_FIRST_HEADER = 150;
const FALLBACK_COMPACT_HEADER = 36;
const FALLBACK_FOOTER = 28;

function sameSizes(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = Object.keys(b);
  return (
    keys.length === Object.keys(a).length &&
    keys.every((key) => Math.abs((a[key] ?? -1) - (b[key] as number)) < 0.5)
  );
}

export interface UsePaperModelInput {
  readonly ready: readonly EditorItem[];
  readonly header: TestHeaderSettings;
  readonly title: string;
  readonly columns: 1 | 2;
  readonly spacing: QuestionSpacing;
}

/**
 * Measures the real rendered height of every question block, the headers and
 * the footer in an off-screen copy, then packs the questions into A4 pages.
 * Images load after first paint, so a ResizeObserver re-measures as they arrive.
 */
export function usePaperModel({ ready, header, title, columns, spacing }: UsePaperModelInput): {
  readonly model: PaperModel;
  readonly measurer: ReactNode;
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<Record<string, number>>({});

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const targets = Array.from(container.querySelectorAll<HTMLElement>('[data-measure]'));
    const read = () => {
      const next: Record<string, number> = {};
      for (const target of targets) {
        next[target.dataset.measure as string] = target.getBoundingClientRect().height;
      }
      setSizes((prev) => (sameSizes(prev, next) ? prev : next));
    };
    read();
    const observer = new ResizeObserver(read);
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  });

  const showAnswerSheet = header.showAnswerSheet === true;
  const showAnswerKey = header.showAnswerKey === true;

  const model = useMemo<PaperModel>(() => {
    const footer = sizes['ft'] ?? FALLBACK_FOOTER;
    const reserved = PAGE_PADDING * 2 + footer + HEADER_GAP + FOOTER_GAP + BODY_SAFETY;
    const firstPageHeight = PAGE_HEIGHT - reserved - (sizes['h1'] ?? FALLBACK_FIRST_HEADER);
    const otherPageHeight = PAGE_HEIGHT - reserved - (sizes['hc'] ?? FALLBACK_COMPACT_HEADER);
    const heights = ready.map((item) => sizes[`q:${item.id}`] ?? FALLBACK_QUESTION_HEIGHT);
    const extras: ExtraPageKind[] = [];
    if (ready.length > 0 && showAnswerSheet) {
      extras.push('answerSheet');
    }
    if (ready.length > 0 && showAnswerKey) {
      extras.push('answerKey');
    }
    return {
      ready,
      pages: paginate({ heights, columns, firstPageHeight, otherPageHeight }),
      extras,
    };
  }, [ready, sizes, columns, showAnswerSheet, showAnswerKey]);

  const measurer = (
    <div
      ref={containerRef}
      aria-hidden="true"
      inert
      style={{
        position: 'absolute',
        left: -10000,
        top: 0,
        visibility: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <div data-measure="h1" style={{ width: CONTENT_WIDTH }}>
        <FirstPageHeader header={header} title={title} />
      </div>
      <div data-measure="hc" style={{ width: CONTENT_WIDTH }}>
        <CompactHeader header={header} title={title} pageNumber={2} totalPages={9} />
      </div>
      <div data-measure="ft" style={{ width: CONTENT_WIDTH }}>
        <PageFooter pageNumber={1} totalPages={9} />
      </div>
      <div style={{ width: columnWidth(columns) }}>
        {ready.map((item, index) => (
          <div key={item.id} data-measure={`q:${item.id}`}>
            <QuestionBlock item={item} number={index + 1} spacing={spacing} eager />
          </div>
        ))}
      </div>
    </div>
  );

  return { model, measurer };
}
