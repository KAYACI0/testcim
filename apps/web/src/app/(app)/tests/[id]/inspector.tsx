'use client';

import { useTranslations } from 'next-intl';
import { useStore } from 'zustand';

import { resolveHeaderSettings } from '@testcim/shared';

import type { EditorStore } from '@/features/editor/store';

import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { AnswerSelector } from '@/features/editor/answer-selector';
import { sortByPosition } from '@/features/editor/op-log';

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

  return (
    <Tabs
      {...(activeTab ? { value: activeTab } : { defaultValue: 'answers' })}
      onValueChange={(val) => onTabChange?.(val as 'page' | 'booklets' | 'answers' | 'output')}
      className="flex h-full flex-col"
    >
      <TabsList className="px-4">
        <TabsTrigger value="page">{t('page')}</TabsTrigger>
        <TabsTrigger value="booklets" disabled>
          {t('booklets')}
        </TabsTrigger>
        <TabsTrigger value="answers">{t('answers')}</TabsTrigger>
        <TabsTrigger value="output" disabled>
          {t('output')}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="page" className="flex-1 overflow-y-auto px-4 pb-6">
        <div className="flex flex-col gap-5 pt-2">
          <div>
            <h3 className="text-xs font-semibold text-ink-2">{t('template.headerSection')}</h3>
            <div className="mt-3 flex flex-col gap-3">
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

              <FormField label={t('template.examTitleLabel')}>
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={header.title ?? ''}
                    placeholder={t('template.examTitlePlaceholder')}
                    onChange={(e) => store.getState().updateHeader({ title: e.target.value })}
                  />
                )}
              </FormField>

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
                <FormField label={t('template.termLabel')}>
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      value={header.term ?? ''}
                      placeholder={t('template.termPlaceholder')}
                      onChange={(e) => store.getState().updateHeader({ term: e.target.value })}
                    />
                  )}
                </FormField>
              </div>

              <FormField label={t('template.examDateLabel')}>
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={header.examDate ?? ''}
                    placeholder={t('template.examDatePlaceholder')}
                    onChange={(e) => store.getState().updateHeader({ examDate: e.target.value })}
                  />
                )}
              </FormField>

              <FormField label={t('template.instructionsLabel')}>
                {(fieldProps) => (
                  <Textarea
                    {...fieldProps}
                    rows={2}
                    value={header.instructions ?? ''}
                    placeholder={t('template.instructionsPlaceholder')}
                    onChange={(e) =>
                      store.getState().updateHeader({ instructions: e.target.value })
                    }
                  />
                )}
              </FormField>
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <h3 className="text-xs font-semibold text-ink-2">{t('template.studentInfoSection')}</h3>
            <div className="mt-3 flex flex-col gap-2.5">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink select-none">
                <Checkbox
                  checked={header.showStudentName}
                  onCheckedChange={(checked) =>
                    store.getState().updateHeader({ showStudentName: Boolean(checked) })
                  }
                />
                <span>{t('template.showStudentName')}</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink select-none">
                <Checkbox
                  checked={header.showClass}
                  onCheckedChange={(checked) =>
                    store.getState().updateHeader({ showClass: Boolean(checked) })
                  }
                />
                <span>{t('template.showClass')}</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink select-none">
                <Checkbox
                  checked={header.showStudentNo}
                  onCheckedChange={(checked) =>
                    store.getState().updateHeader({ showStudentNo: Boolean(checked) })
                  }
                />
                <span>{t('template.showStudentNo')}</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink select-none">
                <Checkbox
                  checked={header.showDate}
                  onCheckedChange={(checked) =>
                    store.getState().updateHeader({ showDate: Boolean(checked) })
                  }
                />
                <span>{t('template.showDate')}</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink select-none">
                <Checkbox
                  checked={header.showScore}
                  onCheckedChange={(checked) =>
                    store.getState().updateHeader({ showScore: Boolean(checked) })
                  }
                />
                <span>{t('template.showScore')}</span>
              </label>

              <div className="flex items-center justify-between gap-2 pt-1">
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink select-none">
                  <Checkbox
                    checked={header.showBookletCode}
                    onCheckedChange={(checked) =>
                      store.getState().updateHeader({ showBookletCode: Boolean(checked) })
                    }
                  />
                  <span>{t('template.showBookletCode')}</span>
                </label>
                {header.showBookletCode && (
                  <Input
                    value={header.bookletCode ?? 'A'}
                    onChange={(e) => store.getState().updateHeader({ bookletCode: e.target.value })}
                    className="h-8 w-16 text-center text-sm font-semibold"
                    maxLength={4}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <h3 className="text-xs font-semibold text-ink-2">{t('template.layoutSection')}</h3>
            <div className="mt-3">
              <FormField label={t('template.columnsLabel')}>
                {(fieldProps) => (
                  <Select
                    value={String(settings?.columns ?? 1)}
                    onValueChange={(val) =>
                      store.getState().updateSettings({ columns: Number(val) })
                    }
                  >
                    <SelectTrigger id={fieldProps.id}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t('template.singleColumn')}</SelectItem>
                      <SelectItem value="2">{t('template.twoColumns')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </FormField>
            </div>
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
