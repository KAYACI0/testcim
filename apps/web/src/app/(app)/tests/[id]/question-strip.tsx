'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { useStore } from 'zustand';

import type { EditorStore } from '@/features/editor/store';

import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { AnswerSelector } from '@/features/editor/answer-selector';
import { sortByPosition } from '@/features/editor/op-log';
import { cn } from '@/lib/cn';

const ROW_HEIGHT = 96;

export function QuestionStrip({ store }: { readonly store: EditorStore }) {
  const items = useStore(store, (s) => s.items);
  const selectedItemId = useStore(store, (s) => s.selectedItemId);
  const t = useTranslations('editor.strip');
  const parentRef = useRef<HTMLDivElement>(null);

  const sorted = sortByPosition(items);
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual returns functions the compiler can't safely memoize; this is expected, not a bug.
  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
  });

  if (sorted.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-ink-2">
        {t('empty')}
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-y-auto">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const item = sorted[virtualRow.index]!;
          const isSelected = item.id === selectedItemId;

          return (
            <div
              key={item.id}
              data-index={virtualRow.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="px-3 py-1.5"
            >
              <button
                type="button"
                onClick={() => store.getState().select(item.id)}
                aria-current={isSelected ? 'true' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 rounded-control border p-2 text-left transition-colors',
                  'duration-[var(--duration-fast)] ease-out',
                  isSelected ? 'border-accent bg-accent-tint' : 'border-line hover:bg-canvas',
                )}
              >
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-thumb border border-line bg-surface">
                  {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- object/signed URLs, not an optimizable static asset
                    <img src={item.thumbnailUrl} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <Icon name="clock" size={16} className="text-ink-3" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-ink-2">
                    {virtualRow.index + 1}. {item.status === 'pending' && t('statusPending')}
                    {item.status === 'uploading' && t('statusUploading')}
                    {item.status === 'processing' && t('statusProcessing')}
                    {item.status === 'error' && t('statusError')}
                  </p>
                  {item.duplicateOfItemId && (
                    <p className="truncate text-xs text-warn">{t('duplicateNotice')}</p>
                  )}
                  {item.status === 'ready' && (
                    <div className="mt-1" onClick={(event) => event.stopPropagation()}>
                      <AnswerSelector
                        correct={item.correct}
                        label={t('correctAnswerLabel')}
                        onChange={(correct) => store.getState().setCorrect(item.id, correct)}
                      />
                    </div>
                  )}
                </div>

                {item.status === 'ready' ? (
                  <IconButton
                    label={t('removeLabel')}
                    onClick={(event) => {
                      event.stopPropagation();
                      store.getState().removeItem(item.id);
                    }}
                  >
                    <Icon name="trash" size={16} />
                  </IconButton>
                ) : item.status === 'error' ? (
                  <IconButton
                    label={t('removeLabel')}
                    onClick={(event) => {
                      event.stopPropagation();
                      store.getState().cancelCapture(item.id);
                    }}
                  >
                    <Icon name="x" size={16} />
                  </IconButton>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
