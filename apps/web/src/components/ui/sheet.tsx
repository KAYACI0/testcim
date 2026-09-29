'use client';

import * as RadixDialog from '@radix-ui/react-dialog';

import { Icon } from './icon';
import { IconButton } from './icon-button';

import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/cn';

export const Sheet = RadixDialog.Root;
export const SheetTrigger = RadixDialog.Trigger;
export const SheetClose = RadixDialog.Close;

export function SheetContent({
  className,
  children,
  title,
  closeLabel,
  side = 'right',
  ...props
}: ComponentPropsWithoutRef<typeof RadixDialog.Content> & {
  readonly title: string;
  readonly closeLabel: string;
  readonly side?: 'left' | 'right';
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
      <RadixDialog.Content
        className={cn(
          'fixed top-0 bottom-0 z-50 w-full max-w-sm border-line bg-surface p-6 shadow-float outline-none',
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
          className,
        )}
        {...props}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <RadixDialog.Title className="text-lg font-semibold text-ink">{title}</RadixDialog.Title>
          <RadixDialog.Close asChild>
            <IconButton label={closeLabel} className="-mt-1 -mr-1">
              <Icon name="x" size={18} />
            </IconButton>
          </RadixDialog.Close>
        </div>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
