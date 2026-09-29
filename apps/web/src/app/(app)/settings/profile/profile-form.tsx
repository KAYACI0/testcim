'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Input } from '@/components/ui/input';
import { requestAccountDeletion, requestDataExport } from '@/lib/kvkk/actions';
import { updateProfile, type ProfileActionState } from '@/lib/profile/actions';

const initialState: ProfileActionState = { status: 'idle' };

export function ProfileForm({ defaultFullName }: { readonly defaultFullName: string }) {
  const t = useTranslations('settings.profile');
  const [state, action, pending] = useActionState(updateProfile, initialState);

  return (
    <div className="mt-6 flex flex-col gap-8">
      <form action={action} className="flex flex-col gap-4">
        <FormField label={t('fullNameLabel')}>
          {(fieldProps) => (
            <Input {...fieldProps} name="fullName" defaultValue={defaultFullName} required />
          )}
        </FormField>
        {state.status === 'saved' && <InlineNotice tone="ok">{t('saved')}</InlineNotice>}
        {state.status === 'error' && <InlineNotice tone="err">{t('saveError')}</InlineNotice>}
        <div>
          <Button type="submit" loading={pending}>
            {t('save')}
          </Button>
        </div>
      </form>

      <div className="border-t border-line pt-6">
        <h3 className="text-sm font-medium text-ink">{t('kvkkTitle')}</h3>
        <p className="mt-1 text-sm text-ink-2">{t('kvkkDescription')}</p>
        <div className="mt-3 flex gap-3">
          <form action={requestDataExport}>
            <Button type="submit" variant="secondary" size="sm">
              {t('requestExport')}
            </Button>
          </form>
          <form action={requestAccountDeletion}>
            <Button type="submit" variant="secondary" size="sm">
              {t('requestDeletion')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
