'use client';

import { useTranslations } from 'next-intl';
import { useActionState, useState } from 'react';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { InlineNotice } from '@/components/ui/inline-notice';
import { Input } from '@/components/ui/input';
import {
  requestOtp,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
  type AuthFormState,
} from '@/lib/auth/actions';

const initialState: AuthFormState = { status: 'idle' };

export function LoginForm({
  nextPath,
  initialError,
}: {
  readonly nextPath: string;
  readonly initialError: boolean;
}) {
  const t = useTranslations('auth');
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>('signin');

  const [signInState, signInAction, signInPending] = useActionState(
    signInWithPassword,
    initialState,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpWithPassword,
    initialState,
  );
  const [otpState, otpAction, otpPending] = useActionState(requestOtp, initialState);

  const activeState = mode === 'signin' ? signInState : mode === 'signup' ? signUpState : otpState;

  return (
    <div className="mt-6 flex flex-col gap-4">
      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 rounded-control bg-canvas p-1 text-sm">
        <button
          type="button"
          onClick={() => setMode('signin')}
          className={`rounded-control py-1.5 font-medium transition-colors ${
            mode === 'signin' ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
          }`}
        >
          Giriş Yap
        </button>
        <button
          type="button"
          onClick={() => setMode('signup')}
          className={`rounded-control py-1.5 font-medium transition-colors ${
            mode === 'signup' ? 'bg-surface text-ink shadow-sm' : 'text-ink-2 hover:text-ink'
          }`}
        >
          Kayıt Ol
        </button>
      </div>

      {initialError && activeState.status === 'idle' && (
        <InlineNotice tone="err">{t('errors.authFailed')}</InlineNotice>
      )}

      {activeState.status === 'error' && activeState.message && (
        <InlineNotice tone="err">
          {activeState.message === 'invalid_email' ? t('errors.invalidEmail') : activeState.message}
        </InlineNotice>
      )}

      {activeState.status === 'sent' && (
        <InlineNotice tone="ok">{activeState.message ?? t('otpSent')}</InlineNotice>
      )}

      {mode === 'signin' && (
        <form action={signInAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={nextPath} />
          <FormField label={t('emailLabel')}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                name="email"
                type="email"
                autoComplete="email"
                placeholder="ad@ornek.com"
                required
              />
            )}
          </FormField>
          <FormField label="Şifre">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            )}
          </FormField>
          <Button type="submit" loading={signInPending} className="w-full">
            Giriş Yap
          </Button>
          <div className="flex items-center justify-between text-xs text-ink-2">
            <button
              type="button"
              onClick={() => setMode('magic')}
              className="text-accent hover:underline"
            >
              Şifresiz bağlantı ile gir
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className="text-accent hover:underline"
            >
              Hesabınız yok mu? Kayıt olun
            </button>
          </div>
        </form>
      )}

      {mode === 'signup' && (
        <form action={signUpAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={nextPath} />
          <FormField label={t('emailLabel')}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                name="email"
                type="email"
                autoComplete="email"
                placeholder="ad@ornek.com"
                required
              />
            )}
          </FormField>
          <FormField label="Şifre (en az 6 karakter)">
            {(fieldProps) => (
              <Input
                {...fieldProps}
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                minLength={6}
                required
              />
            )}
          </FormField>
          <Button type="submit" loading={signUpPending} className="w-full">
            Hesap Oluştur
          </Button>
          <div className="text-center text-xs text-ink-2">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="text-accent hover:underline"
            >
              Zaten hesabınız var mı? Giriş yapın
            </button>
          </div>
        </form>
      )}

      {mode === 'magic' && (
        <form action={otpAction} className="flex flex-col gap-4">
          <FormField label={t('emailLabel')}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                name="email"
                type="email"
                autoComplete="email"
                placeholder="ad@ornek.com"
                required
              />
            )}
          </FormField>
          <Button type="submit" loading={otpPending} className="w-full">
            Giriş Bağlantısı Gönder
          </Button>
          <div className="text-center text-xs text-ink-2">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className="text-accent hover:underline"
            >
              ← Şifre ile giriş yap
            </button>
          </div>
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
