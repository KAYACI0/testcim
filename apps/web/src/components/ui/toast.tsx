'use client';

import * as RadixToast from '@radix-ui/react-toast';

import type { ComponentPropsWithoutRef } from 'react';

import { cn } from '@/lib/cn';

export const ToastProvider = RadixToast.Provider;
export const ToastViewport = ({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof RadixToast.Viewport>) => (
  <RadixToast.Viewport
    className={cn('fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2', className)}
    {...props}
  />
);

export type ToastTone = 'neutral' | 'ok' | 'err';

const TONES: Record<ToastTone, string> = {
  neutral: 'border-line-strong',
  ok: 'border-ok/30',
  err: 'border-err/30',
};

export interface ToastRootProps extends ComponentPropsWithoutRef<typeof RadixToast.Root> {
  readonly title: string;
  readonly description?: string;
  readonly tone?: ToastTone;
}

export function Toast({
  className,
  title,
  description,
  tone = 'neutral',
  ...props
}: ToastRootProps) {
  return (
    <RadixToast.Root
      className={cn('rounded-panel border bg-surface p-4 shadow-float', TONES[tone], className)}
      {...props}
    >
      <RadixToast.Title className="text-sm font-medium text-ink">{title}</RadixToast.Title>
      {description && (
        <RadixToast.Description className="mt-1 text-sm text-ink-2">
          {description}
        </RadixToast.Description>
      )}
    </RadixToast.Root>
  );
}
