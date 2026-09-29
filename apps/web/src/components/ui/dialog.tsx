'use client';

import * as RadixDialog from '@radix-ui/react-dialog';

import { Icon } from './icon';
import { IconButton } from './icon-button';

import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import { cn } from '@/lib/cn';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  closeLabel,
  ...props
}: ComponentPropsWithoutRef<typeof RadixDialog.Content> & {
  readonly title: string;
  readonly description?: string;
  readonly closeLabel: string;
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-ink/40" />
      <RadixDialog.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
          'rounded-dialog border border-line bg-surface p-6 shadow-float outline-none',
          className,
        )}
        {...props}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <RadixDialog.Title className="text-lg font-semibold text-ink">
              {title}
            </RadixDialog.Title>
            {description && (
              <RadixDialog.Description className="mt-1 text-sm text-ink-2">
                {description}
              </RadixDialog.Description>
            )}
          </div>
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

export function DialogFooter({ children }: { readonly children: ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>;
}
