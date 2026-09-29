'use client';

import { Slot } from '@radix-ui/react-slot';
import { forwardRef } from 'react';

import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';
export type ButtonSize = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-control text-sm font-medium ' +
  'transition-colors duration-[var(--duration-fast)] ease-out disabled:pointer-events-none ' +
  'disabled:opacity-40';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-surface hover:bg-accent-hover',
  secondary: 'border border-line-strong text-ink hover:bg-canvas',
  tertiary: 'text-ink hover:bg-canvas',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3',
  md: 'h-10 px-4',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly loading?: boolean;
  readonly asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', loading = false, asChild, disabled, ...props },
    ref,
  ) => {
    const Component = asChild ? Slot : 'button';

    return (
      <Component
        ref={ref}
        className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
        disabled={disabled ?? loading}
        aria-busy={loading || undefined}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
