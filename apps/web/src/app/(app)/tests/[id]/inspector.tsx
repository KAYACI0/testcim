'use client';

import { useTranslations } from 'next-intl';
import { useStore } from 'zustand';

import { resolveHeaderSettings } from '@testcim/shared';

import type { EditorStore } from '@/features/editor/store';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Segmented } from '@/components/ui/segmented';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnswerSelector } from '@/features/editor/answer-selector';
import { sortByPosition } from '@/features/editor/op-log';
import { usePaperExport } from '@/features/editor/paper/paper-export';
import { useTestExport } from '@/features/exports/use-test-export';
import { useEntitlement } from '@/features/workspace/workspace-context';

export interface InspectorProps {
  readonly store: EditorStore;
  readonly activeTab?: 'page' | 'booklets' | 'answers' | 'output';
  readonly onTabChange?: (tab: 'page' | 'booklets' | 'answers' | 'output') => void;
}

export function Inspector({ store, activeTab, onTabChange }: InspectorProps) {
  const items = useStore(store, (s) => s.items);
  const title = useStore(store, (s) => s.title);
  const settings = useStore(store, (s) => s.settings);
  const t = useTranslations('editor.inspector');
  const ready = sortByPosition(items).filter((item) => item.status === 'ready');

  const header = resolveHeaderSettings(settings?.header, title);
  const columns = settings?.columns ?? 2;

  const paperExport = usePaperExport(title);
  const canExportOffice = useEntitlement('docx_pptx_export');
  const officeExport = useTestExport(t('template.exportAnswerLabel'));

  return (
    <Tabs
      {...(activeTab ? { value: activeTab } : { defaultValue: 'page' })}
      onValueChange={(val) => onTabChange?.(val as 'page' | 'booklets' | 'answers' | 'output')}
      className="flex h-full flex-col"
    >
      <TabsList className="px-4">
        <TabsTrigger value="page">{t('page')}</TabsTrigger>
        <TabsTrigger value="answers">
          {t('answers')} {ready.length > 0 && `(${ready.length})`}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="page" className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="flex flex-col gap-4 pt-1">
          {/* Okul */}
          <FormField label={t('template.schoolNameLabel')}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                value={header.schoolName ?? ''}
                placeholder={t('template.schoolNamePlaceholder')}
                onChange={(e) => store.getState().updateHeader({ schoolName: e.target.value })}
              />
            )}
          </FormField>

          {/* Ders & Sınıf Row */}
          <div className="grid grid-cols-2 gap-2">
            <FormField label={t('template.subjectLabel')}>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  value={header.subject ?? ''}
                  placeholder={t('template.subjectPlaceholder')}
                  onChange={(e) => store.getState().updateHeader({ subject: e.target.value })}
                />
              )}
            </FormField>
            <FormField label={t('template.classLabel')}>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  value={header.className ?? ''}
                  placeholder={t('template.classPlaceholder')}
                  onChange={(e) => store.getState().updateHeader({ className: e.target.value })}
                />
              )}
            </FormField>
          </div>

          {/* Öğretmen & Süre Row */}
          <div className="grid grid-cols-2 gap-2">
            <FormField label={t('template.teacherLabel')}>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  value={header.teacherName ?? ''}
                  placeholder={t('template.teacherPlaceholder')}
                  onChange={(e) => store.getState().updateHeader({ teacherName: e.target.value })}
                />
              )}
            </FormField>
            <FormField label={t('template.durationLabel')}>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  value={header.duration ?? ''}
                  placeholder={t('template.durationPlaceholder')}
                  onChange={(e) => store.getState().updateHeader({ duration: e.target.value })}
                />
              )}
            </FormField>
          </div>

          {/* ŞABLON Section */}
          <div className="border-t border-line pt-3">
            <h3 className="text-xs font-semibold text-ink-3">{t('template.templateSection')}</h3>
            <div className="mt-2 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-2">
                {t('template.layoutPresetLabel')}
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
                  <SelectItem value="classic">{t('template.presets.classic')}</SelectItem>
                  <SelectItem value="modern">{t('template.presets.modern')}</SelectItem>
                  <SelectItem value="minimal">{t('template.presets.minimal')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-ink-3">{t('template.presetDesc')}</p>
            </div>
          </div>

          {/* YERLEŞİM Section */}
          <div className="border-t border-line pt-3">
            <h3 className="text-xs font-semibold text-ink-3">{t('template.layoutSection')}</h3>

            {/* Sütun Segmented */}
            <div className="mt-3 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-2">{t('template.columnsLabel')}</label>
              <Segmented
                aria-label={t('template.columnsLabel')}
                value={String(columns)}
                onValueChange={(val) => store.getState().updateSettings({ columns: Number(val) })}
                options={[
                  { value: '1', label: t('template.singleColumn') },
                  { value: '2', label: t('template.twoColumns') },
                ]}
                className="w-full justify-stretch text-center [&>*]:flex-1"
              />
            </div>

            {/* Soru Aralığı Segmented */}
            <div className="mt-3 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-2">{t('template.spacingLabel')}</label>
              <Segmented
                aria-label={t('template.spacingLabel')}
                value={header.questionSpacing ?? 'normal'}
                onValueChange={(val) =>
                  store.getState().updateHeader({
                    questionSpacing: val as 'tight' | 'normal' | 'wide' | 'detailed',
                  })
                }
                options={[
                  { value: 'tight', label: t('template.spacing.tight') },
                  { value: 'normal', label: t('template.spacing.normal') },
                  { value: 'wide', label: t('template.spacing.wide') },
                  { value: 'detailed', label: t('template.spacing.detailed') },
                ]}
                className="w-full justify-stretch text-center [&>*]:flex-1"
              />
            </div>

            {/* Checkboxes */}
            <div className="mt-4 flex flex-col gap-2.5">
              <label className="flex cursor-pointer items-center gap-2.5 text-xs text-ink select-none">
                <Checkbox
                  checked={header.showStudentInfo}
                  onCheckedChange={(checked) =>
                    store.getState().updateHeader({ showStudentInfo: Boolean(checked) })
                  }
                />
                <span>{t('template.showStudentInfo')}</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5 text-xs text-ink select-none">
                <Checkbox
                  checked={header.showColumnDivider}
                  onCheckedChange={(checked) =>
                    store.getState().updateHeader({ showColumnDivider: Boolean(checked) })
                  }
                />
                <span>{t('template.showColumnDivider')}</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5 text-xs text-ink select-none">
                <Checkbox
                  checked={header.showAnswerSheet}
                  onCheckedChange={(checked) =>
                    store.getState().updateHeader({ showAnswerSheet: Boolean(checked) })
                  }
                />
                <span>{t('template.showAnswerSheet')}</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5 text-xs text-ink select-none">
                <Checkbox
                  checked={header.showAnswerKey}
                  onCheckedChange={(checked) =>
                    store.getState().updateHeader({ showAnswerKey: Boolean(checked) })
                  }
                />
                <span>{t('template.showAnswerKey')}</span>
              </label>
            </div>
          </div>

          {/* Action button: PDF indir */}
          <div className="mt-2 border-t border-line pt-4">
            <div className="flex flex-col gap-2">
              <Button
                className="flex w-full items-center justify-center gap-2"
                size="md"
                disabled={paperExport.busy}
                onClick={() => void paperExport.downloadPdf()}
              >
                <Icon name="file-text" size={16} />
                <span>{paperExport.busy ? t('template.pdfBusy') : t('template.downloadPdf')}</span>
              </Button>
              <Button
                variant="secondary"
                className="flex w-full items-center justify-center gap-2"
                size="md"
                onClick={paperExport.print}
              >
                <Icon name="printer" size={16} />
                <span>{t('template.print')}</span>
              </Button>
              <Button
                variant="secondary"
                className="flex w-full items-center justify-center gap-2"
                size="md"
                disabled={!canExportOffice || officeExport.busy !== null || ready.length === 0}
                onClick={() => void officeExport.download('docx')}
              >
                <Icon name="file-text" size={16} />
                <span>
                  {officeExport.busy === 'docx'
                    ? t('template.exportBusy')
                    : t('template.downloadDocx')}
                </span>
              </Button>
              <Button
                variant="secondary"
                className="flex w-full items-center justify-center gap-2"
                size="md"
                disabled={!canExportOffice || officeExport.busy !== null || ready.length === 0}
                onClick={() => void officeExport.download('pptx')}
              >
                <Icon name="file-text" size={16} />
                <span>
                  {officeExport.busy === 'pptx'
                    ? t('template.exportBusy')
                    : t('template.downloadPptx')}
                </span>
              </Button>
            </div>
            {!canExportOffice && (
              <p className="mt-1.5 text-center text-xs text-ink-2">{t('template.exportLocked')}</p>
            )}
            {(officeExport.outcome === 'failed' || officeExport.outcome === 'denied') && (
              <p role="alert" className="mt-1.5 text-center text-xs text-err">
                {officeExport.outcome === 'denied'
                  ? t('template.exportLocked')
                  : t('template.exportError')}
              </p>
            )}
            {paperExport.failed && (
              <p role="alert" className="mt-1.5 text-center text-xs text-err">
                {t('template.pdfError')}
              </p>
            )}
            <p className="mt-1.5 text-center text-[11px] text-ink-3">
              {t('template.watermarkNote')}
            </p>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="answers" className="flex-1 overflow-y-auto px-4">
        {ready.length === 0 ? (
          <p className="text-sm text-ink-2">{t('answersEmpty')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {ready.map((item, index) => (
              <li key={item.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink tabular-nums">{index + 1}</span>
                <AnswerSelector
                  correct={item.correct}
                  optionCount={item.optionCount ?? 5}
                  label={t('correctAnswerFor', { number: index + 1 })}
                  onChange={(correct) => store.getState().setCorrect(item.id, correct)}
                />
              </li>
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}
