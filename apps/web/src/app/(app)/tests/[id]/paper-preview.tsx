'use client';

import { useTranslations } from 'next-intl';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { useStore } from 'zustand';

import { resolveHeaderSettings } from '@testcim/shared';

import type { EditorStore } from '@/features/editor/store';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { sortByPosition } from '@/features/editor/op-log';
import { useImageSizes, usePaperFonts } from '@/features/editor/paper/paper-assets';
import { PRINT_ROOT_ID } from '@/features/editor/paper/paper-export';
import { buildPaperLayout, type PaperLabels } from '@/features/editor/paper/paper-layout';
import { registerPaperSource } from '@/features/editor/paper/paper-registry';
import { PaperView, type PaperViewLabels } from '@/features/editor/paper/paper-view';

export interface PaperPreviewProps {
  readonly store: EditorStore;
  readonly onEditTemplate?: () => void;
}

const subscribeNothing = () => () => undefined;

/** A4 at 96 dpi; the sheets are laid out in millimetres and measure this wide on screen. */
const SHEET_WIDTH_PX = (210 / 25.4) * 96;
/** The scroll area's horizontal padding on each side (p-4, and p-8 from the sm breakpoint). */
const SCROLL_PADDING_PX = 16;
const SCROLL_PADDING_SM_PX = 32;

/** Shrinks the paper to the panel it sits in so a narrow window never crops a sheet. */
function useFitScale(ref: RefObject<HTMLElement | null>): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const padding = window.innerWidth >= 640 ? SCROLL_PADDING_SM_PX : SCROLL_PADDING_PX;
      const available = element.clientWidth - padding * 2;
      setScale(Math.min(1, Math.max(0.3, available / SHEET_WIDTH_PX)));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return scale;
}

export function PaperPreview({ store, onEditTemplate }: PaperPreviewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fitScale = useFitScale(scrollRef);

  const items = useStore(store, (s) => s.items);
  const title = useStore(store, (s) => s.title);
  const settings = useStore(store, (s) => s.settings);
  const selectedItemId = useStore(store, (s) => s.selectedItemId);

  const t = useTranslations('editor.preview');
  const tInsp = useTranslations('editor.inspector');

  const ready = useMemo(
    () => sortByPosition(items).filter((item) => item.status !== 'error'),
    [items],
  );
  const header = resolveHeaderSettings(settings?.header, title);

  const { fonts, failed: fontsFailed } = usePaperFonts();
  const imageUrls = useMemo(
    () =>
      new Map(
        ready.filter((item) => item.thumbnailUrl).map((item) => [item.id, item.thumbnailUrl]),
      ),
    [ready],
  );
  const sizes = useImageSizes(useMemo(() => [...imageUrls.values()], [imageUrls]));

  const labels = useMemo<PaperLabels>(
    () => ({
      defaultSchool: t('defaultSchool'),
      defaultSubject: t('defaultSubject'),
      defaultClass: t('defaultClass'),
      defaultTerm: t('defaultTerm'),
      defaultTitle: t('defaultTitle'),
      studentName: t('studentName'),
      classAndNo: t('classAndNo'),
      score: t('score'),
      teacher: t('teacher'),
      duration: t('duration'),
      durationMinutes: (minutes) => t('durationMinutes', { min: minutes }),
      subjectLine: (subject) => t('subjectLine', { subject }),
      classLine: (className) => t('classLine', { class: className }),
      pointsSuffix: t('pointsSuffix'),
      answerSheetTitle: t('answerSheetTitle'),
      answerKeyTitle: t('answerKeyTitle'),
      footerBrand: t('footerBrand'),
      pageLabel: t('pageNumber', { current: '{page}', total: '{total}' }),
    }),
    [t],
  );

  const viewLabels = useMemo<PaperViewLabels>(
    () => ({
      pageNumber: (page, total) => t('pageNumber', { current: page, total }),
      questionCount: (count) => t('questionCount', { count }),
      answerSheetTitle: t('answerSheetTitle'),
      answerKeyTitle: t('answerKeyTitle'),
      editTemplate: t('editTemplate'),
      emptyTitle: t('emptyQuestionsTitle'),
      emptyHint: t('emptyQuestionsHint'),
    }),
    [t],
  );

  const layout = useMemo(
    () =>
      fonts
        ? buildPaperLayout({
            items: ready.map((item) => ({
              id: item.id,
              imageUrl: item.thumbnailUrl,
              points: item.points,
              correct: item.correct,
            })),
            sizes,
            header,
            title,
            settings: settings ?? null,
            labels,
            measure: fonts.measure,
          })
        : null,
    // `header` is rebuilt from `settings` on every render; settings and title are the inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fonts, ready, sizes, settings, title, labels],
  );

  // The export buttons elsewhere in the editor read the paper that is on screen.
  useEffect(() => {
    registerPaperSource(
      layout
        ? {
            title,
            className: header.className ?? '',
            questions: layout.exportQuestions,
            includeAnswers: header.showAnswerKey === true,
            pages: layout.pages,
            imageUrls,
          }
        : null,
    );
    return () => registerPaperSource(null);
    // `header` is derived from `settings`, which is already a dependency of `layout`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, title, imageUrls]);

  // The print copy lives directly under <body> so print CSS can show it alone.
  const printTarget = useSyncExternalStore(
    subscribeNothing,
    () => document.body,
    () => null,
  );

  // Turning on the answer key page brings it into view so the teacher sees it fill in live.
  const showAnswerKey = header.showAnswerKey === true;
  const hasKeyPage = layout?.pages.some((page) => page.tag === 'answerKey') ?? false;
  useEffect(() => {
    if (!showAnswerKey || !hasKeyPage) {
      return;
    }
    scrollRef.current
      ?.querySelector('[data-extra-page="answerKey"]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [showAnswerKey, hasKeyPage]);

  const handleOpenTemplateEdit = () => {
    setDialogOpen(true);
    onEditTemplate?.();
  };

  const handleSelect = useCallback((key: string) => store.getState().select(key), [store]);

  return (
    <div ref={scrollRef} className="relative h-full overflow-y-auto bg-canvas p-4 sm:p-8">
      {!layout ? (
        <p role="status" className="py-24 text-center text-sm text-ink-2">
          {fontsFailed ? t('loadFailed') : t('loading')}
        </p>
      ) : (
        <>
          <div
            data-paper-screen=""
            className="mx-auto flex w-fit flex-col gap-10"
            // `zoom` (unlike a transform) also shrinks the layout box, so there is no scrollbar.
            style={{ zoom: fitScale }}
          >
            <PaperView
              pages={layout.pages}
              imageUrls={imageUrls}
              questionCounts={layout.questionCounts}
              labels={viewLabels}
              empty={ready.length === 0}
              interactive={{
                selectedKey: selectedItemId,
                onSelect: handleSelect,
                onEditTemplate: handleOpenTemplateEdit,
              }}
            />
          </div>

          {printTarget &&
            createPortal(
              <div id={PRINT_ROOT_ID} aria-hidden="true">
                <PaperView
                  pages={layout.pages}
                  imageUrls={imageUrls}
                  questionCounts={layout.questionCounts}
                  labels={viewLabels}
                  empty={false}
                />
              </div>,
              printTarget,
            )}
        </>
      )}

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
