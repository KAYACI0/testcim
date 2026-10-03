'use client';

import { useTranslations } from 'next-intl';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Input } from '@/components/ui/input';
import { requestOtp, signInWithGoogle, type OtpFormState } from '@/lib/auth/actions';

const initialState: OtpFormState = { status: 'idle' };

export function LoginForm({
  nextPath,
  initialError,
}: {
  readonly nextPath: string;
  readonly initialError: boolean;
}) {
  const t = useTranslations('auth');
  const [state, action, pending] = useActionState(requestOtp, initialState);

  return (
    <div className="mt-8 flex flex-col gap-4">
      {initialError && state.status === 'idle' && (
        <InlineNotice tone="err">{t('errors.authFailed')}</InlineNotice>
      )}

      {state.status === 'error' && state.message && state.message !== 'invalid_email' && (
        <InlineNotice tone="err">{state.message}</InlineNotice>
      )}

      {state.status === 'sent' ? (
        <InlineNotice tone="ok">{t('otpSent')}</InlineNotice>
      ) : (
        <form action={action} className="flex flex-col gap-4">
          <FormField
            label={t('emailLabel')}
            error={
              state.status === 'error' && state.message === 'invalid_email'
                ? t('errors.invalidEmail')
                : undefined
            }
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                name="email"
                type="email"
                autoComplete="email"
                required
                invalid={state.status === 'error'}
              />
            )}
          </FormField>
          <Button type="submit" loading={pending}>
            {t('continueWithEmail')}
          </Button>
        </form>
      )}

      <div className="flex items-center gap-3 text-xs text-ink-3">
        <span className="h-px flex-1 bg-line" />
        {t('or')}
        <span className="h-px flex-1 bg-line" />
      </div>

      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={nextPath} />
        <Button type="submit" variant="secondary" className="w-full">
          {t('continueWithGoogle')}
        </Button>
      </form>
    </div>
  );
}
