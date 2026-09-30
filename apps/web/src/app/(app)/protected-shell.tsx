'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

import type { AppShellNavItem } from '@/components/patterns/app-shell';
import type { WorkspaceMembership } from '@/lib/workspace/current';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/patterns/app-shell';
import { Logo, LogoMark } from '@/components/patterns/logo';
import { Icon } from '@/components/ui/icon';
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@/components/ui/menu';
import { NotificationBell } from '@/features/notifications/components/notification-bell';
import { signOut } from '@/lib/auth/actions';
import { switchWorkspace } from '@/lib/workspace/actions';

const NAV: AppShellNavItem[] = [
  { href: '/tests', label: 'nav.tests', icon: 'file-text' },
  { href: '/bank', label: 'nav.bank', icon: 'folder' },
  { href: '/classes', label: 'nav.classes', icon: 'student' },
  { href: '/omr', label: 'nav.omr', icon: 'scan-smiley' },
  { href: '/exams', label: 'nav.exams', icon: 'exam' },
  { href: '/reports', label: 'nav.reports', icon: 'chart-bar' },
  { href: '/settings/profile', label: 'nav.settings', icon: 'gear' },
];

export function ProtectedShell({
  memberships,
  currentWorkspace,
  userEmail,
  children,
}: {
  readonly memberships: readonly WorkspaceMembership[];
  readonly currentWorkspace: WorkspaceMembership;
  readonly userEmail: string | undefined;
  readonly children: ReactNode;
}) {
  const pathname = usePathname();
  const t = useTranslations();

  const nav = NAV.map((item) => ({ ...item, label: t(item.label) }));
  const activeHref =
    nav.find((item) => pathname.startsWith(item.href))?.href ?? '/settings/profile';

  return (
    <AppShell
      nav={nav}
      activeHref={activeHref}
      workspaceName={currentWorkspace.name}
      railToggleLabel={t('designSystem.railToggleLabel')}
      logo={<Logo />}
      logoMark={<LogoMark />}
      renderLink={(item, content) => <Link href={item.href}>{content}</Link>}
      topBarSlot={
        <div className="flex items-center gap-3">
          {memberships.length > 1 && (
            <form action={switchWorkspace}>
              <select
                name="workspaceId"
                defaultValue={currentWorkspace.id}
                onChange={(event) => event.currentTarget.form?.requestSubmit()}
                aria-label={t('workspace.switcherLabel')}
                className="h-9 rounded-control border border-line-strong bg-surface px-2 text-sm text-ink outline-none focus-visible:border-accent"
              >
                {memberships.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </form>
          )}
          <NotificationBell />
          <Menu>
            <MenuTrigger asChild>
              <button
                type="button"
                aria-label={t('workspace.accountMenuLabel')}
                className="flex h-9 items-center gap-2 rounded-control px-2 text-sm text-ink-2 hover:bg-canvas hover:text-ink"
              >
                <Icon name="gear" size={16} />
                {userEmail}
              </button>
            </MenuTrigger>
            <MenuContent align="end">
              <MenuItem asChild>
                <Link href="/settings/profile">{t('workspace.profileMenuItem')}</Link>
              </MenuItem>
              <MenuItem asChild>
                <Link href="/settings/workspace">{t('workspace.workspaceMenuItem')}</Link>
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                onSelect={() => {
                  void signOut();
                }}
              >
                {t('workspace.signOut')}
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}
