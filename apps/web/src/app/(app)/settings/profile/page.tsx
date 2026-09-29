import { getTranslations } from 'next-intl/server';

import { ProfileForm } from './profile-form';

import { requireSession } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';

export default async function ProfileSettingsPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', session.userId)
    .single();

  const t = await getTranslations('settings.profile');

  return (
    <div className="max-w-sm">
      <h2 className="text-lg font-semibold text-ink">{t('title')}</h2>
      <p className="mt-1 text-sm text-ink-2">{session.email}</p>
      <ProfileForm defaultFullName={profile?.full_name ?? ''} />
    </div>
  );
}
