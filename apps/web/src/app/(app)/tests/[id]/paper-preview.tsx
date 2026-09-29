'use client';

import { useTranslations } from 'next-intl';
import { useStore } from 'zustand';

import type { EditorStore } from '@/features/editor/store';

import { sortByPosition } from '@/features/editor/op-log';

/**
 * Placeholder preview for this slice: pasted question images stacked on a
 * plain white "page" over the canvas background (docs/03 §3). The real
 * paginated layout comes from the layout engine in Prompt 05 — this view
 * exists so pasted questions are visible immediately, not to predict PDF
 * output yet.
 */
export function PaperPreview({ store }: { readonly store: EditorStore }) {
  const items = useStore(store, (s) => s.items);
  const t = useTranslations('editor.preview');
  const ready = sortByPosition(items).filter((item) => item.status !== 'error');

  return (
    <div className="h-full overflow-y-auto bg-canvas p-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 rounded-paper bg-surface p-8 shadow-[0_1px_3px_rgb(20_28_45_/_0.12)]">
        {ready.length === 0 ? (
          <p className="text-sm text-ink-2">{t('empty')}</p>
        ) : (
          ready.map((item, index) => (
            <div
              key={item.id}
              className="flex items-start gap-3 border-b border-line pb-4 last:border-0"
            >
              <span className="mt-1 text-sm text-ink-2 tabular-nums">{index + 1}.</span>
              {item.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- object/signed URLs, not an optimizable static asset
                <img src={item.thumbnailUrl} alt="" className="max-w-full" />
              ) : (
                <div className="h-24 w-full animate-pulse rounded-thumb bg-canvas" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
