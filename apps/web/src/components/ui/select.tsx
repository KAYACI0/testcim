'use client';

import * as RadixSelect from '@radix-ui/react-select';

import { Icon } from './icon';

import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/cn';

export const Select = RadixSelect.Root;
export const SelectValue = RadixSelect.Value;

export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof RadixSelect.Trigger>) {
  return (
    <RadixSelect.Trigger
      className={cn(
        'flex h-10 w-full items-center justify-between gap-2 rounded-control border border-line-strong',
        'bg-surface px-3 text-sm text-ink transition-colors duration-[var(--duration-fast)] outline-none',
        'ease-out focus-visible:border-accent data-[placeholder]:text-ink-3',
        'disabled:cursor-not-allowed disabled:bg-canvas disabled:opacity-60',
        className,
      )}
      {...props}
    >
      {children}
      <RadixSelect.Icon>
        <Icon name="caret-down" size={16} className="text-ink-2" />
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof RadixSelect.Content>) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        position="popper"
        sideOffset={4}
        className={cn(
          'z-50 max-h-72 overflow-y-auto rounded-panel border border-line bg-surface py-1 shadow-float',
          className,
        )}
        {...props}
      >
        <RadixSelect.Viewport>{children}</RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof RadixSelect.Item>) {
  return (
    <RadixSelect.Item
      className={cn(
        'relative flex cursor-pointer items-center rounded-[4px] px-3 py-2 text-sm text-ink outline-none',
        'data-[highlighted]:bg-canvas data-[state=checked]:text-accent',
        className,
      )}
      {...props}
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
    </RadixSelect.Item>
  );
}
