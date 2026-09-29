'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { createTeamWorkspace, type WorkspaceActionState } from '@/lib/workspace/actions';

const initialState: WorkspaceActionState = { status: 'idle' };

export function CreateWorkspaceForm() {
  const t = useTranslations('settings.workspace');
  const [state, action, pending] = useActionState(createTeamWorkspace, initialState);

  return (
    <form action={action} className="mt-4 flex items-end gap-3">
      <div className="flex-1">
        <FormField
          label={t('newTeamNameLabel')}
          error={state.status === 'error' ? t('createTeamError') : undefined}
        >
          {(fieldProps) => <Input {...fieldProps} name="name" required />}
        </FormField>
      </div>
      <Button type="submit" loading={pending}>
        {t('createTeamAction')}
      </Button>
    </form>
  );
}
