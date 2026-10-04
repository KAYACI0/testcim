'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { useStore } from 'zustand';

import type { EditorStore } from '@/features/editor/store';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { AnswerSelector } from '@/features/editor/answer-selector';
import { sortByPosition } from '@/features/editor/op-log';
import { cn } from '@/lib/cn';

const ROW_HEIGHT = 96;

export interface QuestionStripProps {
  readonly store: EditorStore;
  readonly onCaptureFiles?: (files: readonly File[]) => void;
  readonly onWriteQuestion?: () => void;
}

export function QuestionStrip({ store, onCaptureFiles, onWriteQuestion }: QuestionStripProps) {
  const items = useStore(store, (s) => s.items);
  const selectedItemId = useStore(store, (s) => s.selectedItemId);
  const t = useTranslations('editor.strip');

  const [activeTab, setActiveTab] = useState<'questions' | 'library'>('questions');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const sorted = sortByPosition(items);

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual returns functions the compiler can't safely memoize; this is expected, not a bug.
  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 6,
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onCaptureFiles) {
      onCaptureFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && onCaptureFiles) {
      onCaptureFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Top Section: Tabs & Upload Dropzone */}
      <div className="flex shrink-0 flex-col gap-3 border-b border-line p-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 rounded-control bg-canvas p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('questions')}
            className={cn(
              'flex-1 cursor-pointer rounded-[2px] py-1 text-center font-medium transition-colors',
              activeTab === 'questions'
                ? 'bg-surface font-semibold text-ink shadow-[0_1px_2px_rgb(20_28_45_/_0.08)]'
                : 'text-ink-2 hover:text-ink',
            )}
          >
            {t('questionsTab')} {sorted.length > 0 && `(${sorted.length})`}
          </button>
          <Link
            href="/bank"
            className="flex-1 rounded-[2px] py-1 text-center font-medium text-ink-2 transition-colors hover:text-ink"
          >
            {t('libraryTab')}
          </Link>
        </div>

        {/* Upload Drop Zone Card */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center rounded-control border border-dashed p-4 text-center transition-colors',
            isDragging
              ? 'border-accent bg-accent-tint/30'
              : 'border-line bg-canvas/30 hover:border-line-strong hover:bg-canvas/60',
          )}
        >
          <Icon name="upload-simple" size={22} className="text-ink-2" />
          <p className="mt-2 text-xs font-medium text-ink">{t('dropTitle')}</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="mt-0.5 cursor-pointer text-xs font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            {t('chooseFromDevice')}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-ink-3">{t('pasteHint')}</p>
        </div>

        {/* "Soru yaz" Action Button */}
        {onWriteQuestion && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onWriteQuestion}
            className="flex w-full items-center justify-center gap-1.5"
          >
            <Icon name="pencil-simple" size={14} />
            <span>{t('writeQuestion')}</span>
          </Button>
        )}
      </div>

      {/* Questions Scrollable List */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex h-32 items-center justify-center p-6 text-center text-xs text-ink-3">
            {t('empty')}
          </div>
        ) : (
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
                        <img
                          src={item.thumbnailUrl}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Icon name="clock" size={16} className="text-ink-3" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink-2">
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
        )}
      </div>
    </div>
  );
}
