'use client';

import * as RadixMenu from '@radix-ui/react-dropdown-menu';

import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/cn';

export const Menu = RadixMenu.Root;
export const MenuTrigger = RadixMenu.Trigger;

export function MenuContent({
  className,
  sideOffset = 4,
  ...props
}: ComponentPropsWithoutRef<typeof RadixMenu.Content>) {
  return (
    <RadixMenu.Portal>
      <RadixMenu.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-40 rounded-panel border border-line bg-surface py-1 shadow-float',
          className,
        )}
        {...props}
      />
    </RadixMenu.Portal>
  );
}

export function MenuItem({ className, ...props }: ComponentPropsWithoutRef<typeof RadixMenu.Item>) {
  return (
    <RadixMenu.Item
      className={cn(
        'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-ink outline-none',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-canvas',
        className,
      )}
      {...props}
    />
  );
}

export function MenuSeparator({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadixMenu.Separator>) {
  return <RadixMenu.Separator className={cn('my-1 h-px bg-line', className)} {...props} />;
}
