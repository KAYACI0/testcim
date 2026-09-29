import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { OnboardingForm } from './onboarding-form';

import { requireSession } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';

export default async function OnboardingPage() {
  const session = await requireSession();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding')
    .eq('id', session.userId)
    .single();

  if ((profile?.onboarding as { completed?: boolean } | null)?.completed) {
    redirect('/home');
  }

  const t = await getTranslations('onboarding');

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="text-[22px] font-semibold text-ink">{t('title')}</h1>
      <p className="mt-1 text-sm text-ink-2">{t('subtitle')}</p>
      <OnboardingForm />
    </main>
  );
}
