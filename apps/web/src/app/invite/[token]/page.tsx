import { getTranslations } from 'next-intl/server';

import { AcceptInviteForm } from './accept-invite-form';

import { requireSession } from '@/lib/auth/dal';

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  await requireSession();
  const { token } = await params;
  const t = await getTranslations('workspace.invite');

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-16">
      <h1 className="text-[22px] font-semibold text-ink">{t('title')}</h1>
      <p className="mt-1 text-sm text-ink-2">{t('description')}</p>
      <AcceptInviteForm token={token} />
    </main>
  );
}
