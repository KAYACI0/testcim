'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Input } from '@/components/ui/input';
import { createClass, type CreateClassState } from '@/features/classes/actions.server';

const initialState: CreateClassState = { status: 'idle' };

export function NewClassForm() {
  const t = useTranslations('classes.new');
  const [state, action, pending] = useActionState(createClass, initialState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <FormField label={t('nameLabel')} required>
        {(fieldProps) => (
          <Input {...fieldProps} name="name" required placeholder={t('namePlaceholder')} />
        )}
      </FormField>

      <FormField label={t('gradeLabel')}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            name="grade"
            type="number"
            min={1}
            max={12}
            placeholder={t('gradePlaceholder')}
          />
        )}
      </FormField>

      <FormField label={t('schoolYearLabel')} hint={t('schoolYearHint')}>
        {(fieldProps) => (
          <Input {...fieldProps} name="schoolYear" placeholder={t('schoolYearPlaceholder')} />
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
