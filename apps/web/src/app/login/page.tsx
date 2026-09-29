import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { LoginForm } from './login-form';

import { Logo } from '@/components/patterns/logo';
import { getSession } from '@/lib/auth/dal';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSession();

  if (session) {
    redirect('/home');
  }

  const { next, error } = await searchParams;
  const t = await getTranslations('auth');

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <Logo className="mb-8" />
      <h1 className="text-[22px] font-semibold text-ink">{t('title')}</h1>
      <p className="mt-1 text-sm text-ink-2">{t('subtitle')}</p>
      <LoginForm nextPath={next ?? '/home'} initialError={error === 'auth_failed'} />
    </main>
  );
}
