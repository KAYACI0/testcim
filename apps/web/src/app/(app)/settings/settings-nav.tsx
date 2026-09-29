'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/cn';

const ITEMS = [
  { href: '/settings/profile', key: 'profile' },
  { href: '/settings/workspace', key: 'workspace' },
  { href: '/settings/members', key: 'members' },
  { href: '/settings/plan', key: 'plan' },
] as const;

export function SettingsNav() {
  const pathname = usePathname();
  const t = useTranslations('settings.nav');

  return (
    <nav className="flex gap-4 border-b border-line px-6" aria-label={t('label')}>
      {ITEMS.map((item) => {
        const isActive = pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'border-b-2 border-transparent px-1 py-3 text-sm text-ink-2 transition-colors',
              'duration-[var(--duration-fast)] ease-out hover:text-ink',
              isActive && 'border-accent text-ink',
            )}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
