'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { InlineNotice } from '@/components/ui/inline-notice';
import { acceptInvite, type AcceptInviteState } from '@/lib/workspace/actions';

const initialState: AcceptInviteState = { status: 'idle' };

export function AcceptInviteForm({ token }: { readonly token: string }) {
  const t = useTranslations('workspace.invite');
  const [state, action, pending] = useActionState(acceptInvite, initialState);

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      {state.status === 'error' && (
        <InlineNotice tone="err">{t(`errors.${state.message ?? 'invite_not_found'}`)}</InlineNotice>
      )}
      <Button type="submit" loading={pending}>
        {t('accept')}
      </Button>
    </form>
  );
}
