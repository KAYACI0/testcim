'use client';

import { Command as Cmdk } from 'cmdk';
import { useEffect, useState } from 'react';

import { Icon } from '../ui/icon';
import { Kbd } from '../ui/kbd';

import type { IconName } from '../ui/icon';

export interface CommandPaletteItem {
  readonly href: string;
  readonly label: string;
  readonly icon: IconName;
}

export interface CommandPaletteProps {
  readonly items: readonly CommandPaletteItem[];
  readonly label: string;
  readonly placeholder: string;
  readonly emptyMessage: string;
  readonly navigate: (href: string) => void;
}

export function CommandPalette({
  items,
  label,
  placeholder,
  emptyMessage,
  navigate,
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <Cmdk.Dialog
      open={open}
      onOpenChange={setOpen}
      label={label}
      overlayClassName="fixed inset-0 z-50 bg-ink/40"
      contentClassName="fixed top-24 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 rounded-panel border border-line bg-surface shadow-float"
    >
      <div className="flex items-center gap-2 border-b border-line px-4">
        <Icon name="magnifying-glass" size={16} className="text-ink-3" />
        <Cmdk.Input
          placeholder={placeholder}
          className="h-12 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
        />
        <Kbd>Esc</Kbd>
      </div>
      <Cmdk.List className="max-h-80 overflow-y-auto p-2">
        <Cmdk.Empty className="px-2 py-4 text-center text-sm text-ink-2">{emptyMessage}</Cmdk.Empty>
        {items.map((item) => (
          <Cmdk.Item
            key={item.href}
            value={item.label}
            onSelect={() => {
              navigate(item.href);
              setOpen(false);
            }}
            className="flex cursor-pointer items-center gap-3 rounded-control px-3 py-2 text-sm text-ink data-[selected=true]:bg-canvas"
          >
            <Icon name={item.icon} size={16} className="text-ink-2" />
            {item.label}
          </Cmdk.Item>
        ))}
      </Cmdk.List>
    </Cmdk.Dialog>
  );
}
