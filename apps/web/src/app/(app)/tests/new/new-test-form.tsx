'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createTest, type CreateTestState } from '@/features/editor/actions.server';

const initialState: CreateTestState = { status: 'idle' };

export function NewTestForm() {
  const t = useTranslations('tests.new');
  const [state, action, pending] = useActionState(createTest, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormField label={t('titleLabel')}>
        {(fieldProps) => (
          <Input {...fieldProps} name="title" required placeholder={t('titlePlaceholder')} />
        )}
      </FormField>

      <FormField label={t('typeLabel')}>
        {(fieldProps) => (
          <Select name="type" defaultValue="test_paper">
            <SelectTrigger id={fieldProps.id}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exam">{t('types.exam')}</SelectItem>
              <SelectItem value="test_paper">{t('types.testPaper')}</SelectItem>
              <SelectItem value="mock">{t('types.mock')}</SelectItem>
              <SelectItem value="written">{t('types.written')}</SelectItem>
              <SelectItem value="worksheet">{t('types.worksheet')}</SelectItem>
              <SelectItem value="quiz">{t('types.quiz')}</SelectItem>
            </SelectContent>
          </Select>
        )}
      </FormField>

      {state.status === 'error' && <InlineNotice tone="err">{t('createError')}</InlineNotice>}

      <div>
        <Button type="submit" loading={pending}>
          {t('create')}
        </Button>
      </div>
    </form>
  );
}
