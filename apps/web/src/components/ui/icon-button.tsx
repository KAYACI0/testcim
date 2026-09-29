'use client';

import { forwardRef } from 'react';

import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly label: string;
  readonly active?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, label, active = false, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={active || undefined}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-control text-ink-2',
        'transition-colors duration-[var(--duration-fast)] ease-out hover:bg-canvas hover:text-ink',
        'disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-accent-tint text-accent',
        className,
      )}
      {...props}
    />
  ),
);
IconButton.displayName = 'IconButton';
