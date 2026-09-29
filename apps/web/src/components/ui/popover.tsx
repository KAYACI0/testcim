'use client';

import * as RadixPopover from '@radix-ui/react-popover';

import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/cn';

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;
export const PopoverAnchor = RadixPopover.Anchor;

export function PopoverContent({
  className,
  sideOffset = 6,
  ...props
}: ComponentPropsWithoutRef<typeof RadixPopover.Content>) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        sideOffset={sideOffset}
        className={cn(
          'z-50 rounded-panel border border-line bg-surface p-3 shadow-float outline-none',
          className,
        )}
        {...props}
      />
    </RadixPopover.Portal>
  );
}
