import { getTranslations } from 'next-intl/server';

import { SettingsNav } from './settings-nav';

import type { ReactNode } from 'react';

import { PageHeader } from '@/components/patterns/page-header';

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('settings');

  return (
    <div className="flex flex-col">
      <PageHeader title={t('title')} />
      <SettingsNav />
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}
