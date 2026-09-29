'use client';

import { forwardRef } from 'react';

import type { InputHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly invalid?: boolean;
}

export const FIELD_BASE =
  'h-10 w-full rounded-control border bg-surface px-3 text-sm text-ink placeholder:text-ink-3 ' +
  'transition-colors duration-[var(--duration-fast)] ease-out outline-none ' +
  'focus-visible:border-accent disabled:cursor-not-allowed disabled:bg-canvas disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid = false, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(FIELD_BASE, invalid ? 'border-err' : 'border-line-strong', className)}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
