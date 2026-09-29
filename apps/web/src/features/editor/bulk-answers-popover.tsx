'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useStore } from 'zustand';

import { parseBulkAnswers } from './bulk-answers';
import { sortByPosition } from './op-log';

import type { EditorStore } from './store';

import { Button } from '@/components/ui/button';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';

export function BulkAnswersPopover({ store }: { readonly store: EditorStore }) {
  const items = useStore(store, (s) => s.items);
  const t = useTranslations('editor.bulkAnswers');
  const [value, setValue] = useState('');
  const ready = sortByPosition(items).filter((item) => item.status === 'ready');
  const parsed = parseBulkAnswers(value);
  const mismatch = value.trim().length > 0 && parsed.length !== ready.length;

  function apply() {
    for (const answer of parsed) {
      const item = ready[answer.index - 1];
      if (item) {
        store.getState().setCorrect(item.id, { question_type: 'mcq', option_id: answer.letter });
      }
    }
    setValue('');
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm">
          {t('trigger')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <p className="mb-2 text-sm font-medium text-ink">{t('title')}</p>
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t('placeholder')}
          rows={3}
        />
        {mismatch && (
          <InlineNotice tone="warn" className="mt-2">
            {t('mismatch', { parsed: parsed.length, total: ready.length })}
          </InlineNotice>
        )}
        <div className="mt-3 flex justify-end">
          <Button size="sm" disabled={parsed.length === 0} onClick={apply}>
            {t('apply')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
