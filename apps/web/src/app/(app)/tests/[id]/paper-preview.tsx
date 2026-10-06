'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
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
import { PRINT_ROOT_ID } from '@/features/editor/paper/paper-export';
import { PaperPages, type QuestionSpacing } from '@/features/editor/paper/paper-parts';
import { usePaperModel } from '@/features/editor/paper/use-paper-model';

export interface PaperPreviewProps {
  readonly store: EditorStore;
  readonly onEditTemplate?: () => void;
}

const subscribeNothing = () => () => undefined;

export function PaperPreview({ store, onEditTemplate }: PaperPreviewProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
  const columns: 1 | 2 = settings?.columns === 1 ? 1 : 2;
  const spacing: QuestionSpacing = header.questionSpacing ?? 'normal';

  const { model, measurer } = usePaperModel({ ready, header, title, columns, spacing });

  // The print copy lives directly under <body> so print CSS can show it alone.
  const printTarget = useSyncExternalStore(
    subscribeNothing,
    () => document.body,
    () => null,
  );

  // Turning on the answer key page brings it into view so the teacher sees it fill in live.
  const showAnswerKey = header.showAnswerKey === true;
  useEffect(() => {
    if (!showAnswerKey) {
      return;
    }
    scrollRef.current
      ?.querySelector('[data-extra-page="answerKey"]')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [showAnswerKey]);

  const handleOpenTemplateEdit = () => {
    setDialogOpen(true);
    onEditTemplate?.();
  };

  return (
    <div ref={scrollRef} className="relative h-full overflow-y-auto bg-canvas p-4 sm:p-8">
      {measurer}
      <div data-paper-screen="" className="mx-auto flex w-fit flex-col gap-10">
        <PaperPages
          model={model}
          header={header}
          title={title}
          columns={columns}
          spacing={spacing}
          selectedItemId={selectedItemId}
          onSelectItem={(id) => store.getState().select(id)}
          onEditTemplate={handleOpenTemplateEdit}
        />
      </div>

      {printTarget &&
        createPortal(
          <div id={PRINT_ROOT_ID} aria-hidden="true">
            <PaperPages
              model={model}
              header={header}
              title={title}
              columns={columns}
              spacing={spacing}
              eager
              bare
            />
          </div>,
          printTarget,
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
