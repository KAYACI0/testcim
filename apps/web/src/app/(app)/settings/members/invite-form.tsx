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
import { inviteMember, type WorkspaceActionState } from '@/lib/workspace/actions';

const initialState: WorkspaceActionState & { inviteUrl?: string } = { status: 'idle' };

export function InviteForm({ workspaceId }: { readonly workspaceId: string }) {
  const t = useTranslations('settings.members');
  const [state, action, pending] = useActionState(inviteMember, initialState);

  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <FormField label={t('inviteEmailLabel')}>
            {(fieldProps) => <Input {...fieldProps} name="email" type="email" required />}
          </FormField>
        </div>
        <FormField label={t('inviteRoleLabel')}>
          {(fieldProps) => (
            <Select name="role" defaultValue="editor">
              <SelectTrigger id={fieldProps.id} className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">{t('roles.admin')}</SelectItem>
                <SelectItem value="editor">{t('roles.editor')}</SelectItem>
                <SelectItem value="viewer">{t('roles.viewer')}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </FormField>
        <Button type="submit" loading={pending}>
          {t('inviteAction')}
        </Button>
      </div>

      {state.status === 'error' && <InlineNotice tone="err">{t('inviteError')}</InlineNotice>}
      {state.inviteUrl && (
        <InlineNotice tone="ok">
          {t('inviteCreated')} <span className="font-medium">{state.inviteUrl}</span>
        </InlineNotice>
      )}
    </form>
  );
}
