'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useStore } from 'zustand';

import { resolveHeaderSettings } from '@testcim/shared';

import type { EditorStore } from '@/features/editor/store';
import type { EditorItem } from '@/features/editor/types';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

/**
 * Question capacity per page based on columns and question spacing.
 * Page 1 has lower capacity due to the full exam header + student info line.
 */
function getPageCapacities(columns: number, spacing: string = 'normal') {
  if (columns === 2) {
    switch (spacing) {
      case 'tight':
        return { page1: 8, others: 10 };
      case 'wide':
        return { page1: 4, others: 6 };
      case 'detailed':
        return { page1: 2, others: 4 };
      case 'normal':
      default:
        return { page1: 6, others: 8 };
    }
  }

  // Single column
  switch (spacing) {
    case 'tight':
      return { page1: 4, others: 5 };
    case 'wide':
      return { page1: 2, others: 3 };
    case 'detailed':
      return { page1: 2, others: 2 };
    case 'normal':
    default:
      return { page1: 3, others: 4 };
  }
}

export function PaperPreview({ store, onEditTemplate }: PaperPreviewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const items = useStore(store, (s) => s.items);
  const title = useStore(store, (s) => s.title);
  const settings = useStore(store, (s) => s.settings);
  const selectedItemId = useStore(store, (s) => s.selectedItemId);

  const t = useTranslations('editor.preview');
  const tInsp = useTranslations('editor.inspector');

  const ready = sortByPosition(items).filter((item) => item.status !== 'error');
  const header = resolveHeaderSettings(settings?.header, title);
  const columns = settings?.columns ?? 2;
  const spacingClass =
    SPACING_CLASSES[header.questionSpacing ?? 'normal'] ?? SPACING_CLASSES.normal;

  const { page1: page1Cap, others: otherCap } = getPageCapacities(
    columns,
    header.questionSpacing ?? 'normal',
  );

  // Partition questions across A4 pages
  const pages: { items: EditorItem[]; startIndex: number; pageNumber: number }[] = [];
  if (ready.length === 0) {
    pages.push({ items: [], startIndex: 0, pageNumber: 1 });
  } else {
    pages.push({
      items: ready.slice(0, page1Cap),
      startIndex: 0,
      pageNumber: 1,
    });

    let offset = page1Cap;
    let pageNum = 2;
    while (offset < ready.length) {
      pages.push({
        items: ready.slice(offset, offset + otherCap),
        startIndex: offset,
        pageNumber: pageNum,
      });
      offset += otherCap;
      pageNum += 1;
    }
  }

  const handleOpenTemplateEdit = () => {
    setDialogOpen(true);
    onEditTemplate?.();
  };

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

  return (
    <div className="h-full overflow-y-auto bg-canvas p-4 sm:p-8">
      <div className="mx-auto flex flex-col items-center gap-10">
        {pages.map((page) => {
          const isFirstPage = page.pageNumber === 1;
          const isLastPage = page.pageNumber === pages.length;
          const pageMid = Math.ceil(page.items.length / 2);
          const col1 = page.items.slice(0, pageMid);
          const col2 = page.items.slice(pageMid);

          return (
            <div key={page.pageNumber} className="flex w-full max-w-[794px] flex-col gap-2">
              {/* Page Number Badge above sheet */}
              <div className="flex items-center justify-between px-1 text-xs text-ink-3 print:hidden">
                <span className="font-semibold text-ink-2">
                  {t('pageNumber', { current: page.pageNumber, total: pages.length })}
                </span>
                <span>
                  {page.items.length > 0 ? `${page.items.length} soru` : t('emptyQuestionsHint')}
                </span>
              </div>

              {/* Fixed A4 Paper Sheet (794px x 1123px at 96 DPI) */}
              <div className="relative mx-auto flex min-h-[1123px] w-full max-w-[794px] flex-col rounded-paper border border-line bg-surface p-8 shadow-[0_1px_3px_rgb(20_28_45_/_0.12)] sm:p-12 print:m-0 print:min-h-0 print:w-full print:max-w-none print:border-none print:p-8 print:shadow-none">
                {/* Header: Full detailed header on Page 1, compact header on subsequent pages */}
                {isFirstPage ? (
                  <header className="relative mb-6 border-b-2 border-line-strong pb-4">
                    {/* "Şablonu düzenle" Action Button */}
                    <div className="absolute top-0 right-0 print:hidden">
                      <button
                        type="button"
                        onClick={handleOpenTemplateEdit}
                        className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-2 transition-colors hover:border-line-strong hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                      >
                        <Icon name="pencil-simple" size={14} />
                        <span>{t('editTemplate')}</span>
                      </button>
                    </div>

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
                                  <strong className="font-medium text-ink-2">
                                    {t('teacher')}:
                                  </strong>{' '}
                                  {header.teacherName}
                                </span>
                              )}
                              {header.duration && (
                                <span>
                                  <strong className="font-medium text-ink-2">
                                    {t('duration')}:
                                  </strong>{' '}
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
                      <p className="mt-2.5 text-center text-xs text-ink-3 italic">
                        {header.instructions}
                      </p>
                    )}
                  </header>
                ) : (
                  /* Subsequent Pages: Compact Header (No Detailed Banner) */
                  <header className="mb-6 flex items-center justify-between border-b border-line pb-2.5 text-xs">
                    <div className="flex items-center gap-2 truncate text-ink-2">
                      <span className="truncate font-bold text-ink">
                        {header.schoolName || t('defaultSchool')}
                      </span>
                      <span className="text-ink-3">•</span>
                      <span className="truncate">
                        {[header.subject, header.className, header.title || title]
                          .filter(Boolean)
                          .join(' - ')}
                      </span>
                    </div>
                    <div className="shrink-0 font-medium text-ink-2 tabular-nums">
                      {t('pageNumber', { current: page.pageNumber, total: pages.length })}
                    </div>
                  </header>
                )}

                {/* Questions Body for this page */}
                {ready.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center rounded-control border border-dashed border-line-strong px-6 py-24 text-center">
                    <Icon name="exam" size={36} className="text-ink-3" />
                    <p className="mt-3 text-sm font-semibold text-ink">
                      {t('emptyQuestionsTitle')}
                    </p>
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
                      {col1.map((item, idx) => renderQuestion(item, page.startIndex + idx))}
                    </div>
                    <div className="flex flex-col">
                      {col2.map((item, idx) =>
                        renderQuestion(item, page.startIndex + pageMid + idx),
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col">
                    {page.items.map((item, idx) => renderQuestion(item, page.startIndex + idx))}
                  </div>
                )}

                {/* Optional Answer Sheet on the last page */}
                {isLastPage && header.showAnswerSheet && ready.length > 0 && (
                  <div className="mt-8 border-t-2 border-line-strong pt-4">
                    <h4 className="mb-3 text-center text-xs font-bold text-ink">
                      {t('answerSheetTitle')}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      {ready.map((item, idx) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-center gap-1.5 py-0.5"
                        >
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

                {/* Optional Answer Key on the last page */}
                {isLastPage && header.showAnswerKey && ready.length > 0 && (
                  <div className="mt-6 border-t border-line pt-3">
                    <h4 className="mb-2 text-center text-xs font-bold text-ink">
                      {t('answerKeyTitle')}
                    </h4>
                    <div className="flex flex-wrap justify-center gap-3 text-xs">
                      {ready.map((item, idx) => {
                        const ans =
                          item.correct && 'choice' in item.correct
                            ? String(item.correct.choice)
                            : '-';
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

                {/* Page Footer */}
                <footer className="mt-auto flex items-center justify-between border-t border-line/60 pt-4 text-[10px] text-ink-3">
                  <span>Testcim</span>
                  <span className="tabular-nums">
                    {t('pageNumber', { current: page.pageNumber, total: pages.length })}
                  </span>
                </footer>
              </div>
            </div>
          );
        })}
      </div>

      {/* "Şablonu Düzenle" Interactive Dialog Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          title={t('dialogTitle')}
          description={t('dialogDescription')}
          closeLabel={t('dialogClose')}
          className="max-h-[90vh] overflow-y-auto sm:max-w-lg"
        >
          <div className="flex flex-col gap-4 pt-2">
            {/* Okul Adı */}
            <FormField label={tInsp('template.schoolNameLabel')}>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  value={header.schoolName ?? ''}
                  placeholder={tInsp('template.schoolNamePlaceholder')}
                  onChange={(e) => store.getState().updateHeader({ schoolName: e.target.value })}
                />
              )}
            </FormField>

            {/* Sınav Başlığı & Dönem */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label={tInsp('template.examTitleLabel')}>
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={header.title ?? ''}
                    placeholder={tInsp('template.examTitlePlaceholder')}
                    onChange={(e) => store.getState().updateHeader({ title: e.target.value })}
                  />
                )}
              </FormField>
              <FormField label={tInsp('template.termLabel')}>
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={header.term ?? ''}
                    placeholder={tInsp('template.termPlaceholder')}
                    onChange={(e) => store.getState().updateHeader({ term: e.target.value })}
                  />
                )}
              </FormField>
            </div>

            {/* Ders & Sınıf */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label={tInsp('template.subjectLabel')}>
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={header.subject ?? ''}
                    placeholder={tInsp('template.subjectPlaceholder')}
                    onChange={(e) => store.getState().updateHeader({ subject: e.target.value })}
                  />
                )}
              </FormField>
              <FormField label={tInsp('template.classLabel')}>
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={header.className ?? ''}
                    placeholder={tInsp('template.classPlaceholder')}
                    onChange={(e) => store.getState().updateHeader({ className: e.target.value })}
                  />
                )}
              </FormField>
            </div>

            {/* Öğretmen & Süre */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label={tInsp('template.teacherLabel')}>
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={header.teacherName ?? ''}
                    placeholder={tInsp('template.teacherPlaceholder')}
                    onChange={(e) => store.getState().updateHeader({ teacherName: e.target.value })}
                  />
                )}
              </FormField>
              <FormField label={tInsp('template.durationLabel')}>
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={header.duration ?? ''}
                    placeholder={tInsp('template.durationPlaceholder')}
                    onChange={(e) => store.getState().updateHeader({ duration: e.target.value })}
                  />
                )}
              </FormField>
            </div>

            {/* Sınav Yönergesi */}
            <FormField label={tInsp('template.instructionsLabel')}>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  value={header.instructions ?? ''}
                  placeholder={tInsp('template.instructionsPlaceholder')}
                  onChange={(e) => store.getState().updateHeader({ instructions: e.target.value })}
                />
              )}
            </FormField>

            {/* Şablon Düzeni */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-2">
                {tInsp('template.layoutPresetLabel')}
              </label>
              <Select
                value={header.layoutPreset ?? 'classic'}
                onValueChange={(val) =>
                  store
                    .getState()
                    .updateHeader({ layoutPreset: val as 'classic' | 'modern' | 'minimal' })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="classic">{tInsp('template.presets.classic')}</SelectItem>
                  <SelectItem value="modern">{tInsp('template.presets.modern')}</SelectItem>
                  <SelectItem value="minimal">{tInsp('template.presets.minimal')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Checkboxes */}
            <div className="mt-2 flex flex-col gap-2.5 border-t border-line pt-3">
              <label className="flex cursor-pointer items-center gap-2.5 text-xs text-ink select-none">
                <Checkbox
                  checked={header.showStudentInfo}
                  onCheckedChange={(checked) =>
                    store.getState().updateHeader({ showStudentInfo: Boolean(checked) })
                  }
                />
                <span>{tInsp('template.showStudentInfo')}</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5 text-xs text-ink select-none">
                <Checkbox
                  checked={header.showColumnDivider}
                  onCheckedChange={(checked) =>
                    store.getState().updateHeader({ showColumnDivider: Boolean(checked) })
                  }
                />
                <span>{tInsp('template.showColumnDivider')}</span>
              </label>
            </div>

            {/* Submit / Done Button */}
            <div className="mt-3 flex justify-end border-t border-line pt-3">
              <Button type="button" variant="primary" onClick={() => setDialogOpen(false)}>
                {t('dialogSave')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
