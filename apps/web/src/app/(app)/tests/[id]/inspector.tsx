'use client';

import { useTranslations } from 'next-intl';
import { useStore } from 'zustand';

import type { EditorStore } from '@/features/editor/store';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnswerSelector } from '@/features/editor/answer-selector';
import { sortByPosition } from '@/features/editor/op-log';

export function Inspector({ store }: { readonly store: EditorStore }) {
  const items = useStore(store, (s) => s.items);
  const t = useTranslations('editor.inspector');
  const ready = sortByPosition(items).filter((item) => item.status === 'ready');

  return (
    <Tabs defaultValue="answers" className="flex h-full flex-col">
      <TabsList className="px-4">
        <TabsTrigger value="page" disabled>
          {t('page')}
        </TabsTrigger>
        <TabsTrigger value="booklets" disabled>
          {t('booklets')}
        </TabsTrigger>
        <TabsTrigger value="answers">{t('answers')}</TabsTrigger>
        <TabsTrigger value="output" disabled>
          {t('output')}
        </TabsTrigger>
      </TabsList>
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
