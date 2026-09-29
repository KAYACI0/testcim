'use client';

import { useState } from 'react';

import { Icon } from '../ui/icon';
import { Tooltip, TooltipProvider } from '../ui/tooltip';

import type { IconName } from '../ui/icon';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

export interface AppShellNavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: IconName;
}

export interface AppShellProps {
  readonly nav: readonly AppShellNavItem[];
  readonly activeHref: string;
  readonly workspaceName: string;
  readonly railToggleLabel: string;
  readonly logo: ReactNode;
  readonly logoMark: ReactNode;
  readonly topBarSlot?: ReactNode;
  readonly children: ReactNode;
  readonly renderLink: (item: AppShellNavItem, content: ReactNode) => ReactNode;
}

export function AppShell({
  nav,
  activeHref,
  workspaceName,
  railToggleLabel,
  logo,
  logoMark,
  topBarSlot,
  children,
  renderLink,
}: AppShellProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-surface">
        <nav
          className={cn(
            'flex shrink-0 flex-col border-r border-line py-3 transition-[width] duration-[var(--duration-base)] ease-out',
            expanded ? 'w-52' : 'w-14',
          )}
        >
          <div className="mb-4 flex items-center px-3">{expanded ? logo : logoMark}</div>
          <ul className="flex flex-1 flex-col gap-1 px-2">
            {nav.map((item) => {
              const isActive = item.href === activeHref;
              const content = (
                <span
                  className={cn(
                    'flex items-center gap-3 rounded-control px-2 py-2 text-sm transition-colors',
                    'duration-[var(--duration-fast)] ease-out',
                    isActive
                      ? 'bg-accent-tint text-accent'
                      : 'text-ink-2 hover:bg-canvas hover:text-ink',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon name={item.icon} size={20} />
                  {expanded && <span className="truncate">{item.label}</span>}
                </span>
              );

              return (
                <li key={item.href}>
                  {expanded ? (
                    renderLink(item, content)
                  ) : (
                    <Tooltip content={item.label} side="right">
                      <span>{renderLink(item, content)}</span>
                    </Tooltip>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            aria-label={railToggleLabel}
            aria-pressed={expanded}
            onClick={() => setExpanded((value) => !value)}
            className="mx-2 flex h-9 items-center justify-center rounded-control text-ink-2 hover:bg-canvas hover:text-ink"
          >
            <Icon name={expanded ? 'caret-left' : 'caret-right'} size={16} />
          </button>
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-line px-6">
            <span className="text-sm font-medium text-ink">{workspaceName}</span>
            {topBarSlot}
          </header>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
