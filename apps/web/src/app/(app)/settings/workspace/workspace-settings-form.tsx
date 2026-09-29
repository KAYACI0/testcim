'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Input } from '@/components/ui/input';
import {
  updateWorkspaceSettings,
  type WorkspaceSettingsState,
} from '@/lib/workspace/settings-actions';

const initialState: WorkspaceSettingsState = { status: 'idle' };

export function WorkspaceSettingsForm({
  workspaceId,
  defaultName,
  defaultSchoolName,
  canEdit,
}: {
  readonly workspaceId: string;
  readonly defaultName: string;
  readonly defaultSchoolName: string;
  readonly canEdit: boolean;
}) {
  const t = useTranslations('settings.workspace');
  const [state, action, pending] = useActionState(updateWorkspaceSettings, initialState);

  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <FormField label={t('nameLabel')}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            name="name"
            defaultValue={defaultName}
            required
            disabled={!canEdit}
          />
        )}
      </FormField>
      <FormField label={t('schoolNameLabel')} hint={t('schoolNameHint')}>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            name="schoolName"
            defaultValue={defaultSchoolName}
            disabled={!canEdit}
          />
        )}
      </FormField>
      {state.status === 'saved' && <InlineNotice tone="ok">{t('saved')}</InlineNotice>}
      {state.status === 'error' && <InlineNotice tone="err">{t('saveError')}</InlineNotice>}
      {canEdit && (
        <div>
          <Button type="submit" loading={pending}>
            {t('save')}
          </Button>
        </div>
      )}
    </form>
  );
}
