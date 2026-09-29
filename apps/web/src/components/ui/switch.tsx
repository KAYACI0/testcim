'use client';

import * as RadixSwitch from '@radix-ui/react-switch';
import { forwardRef } from 'react';

import type { ComponentPropsWithoutRef, ElementRef } from 'react';

import { cn } from '@/lib/cn';

export type SwitchProps = ComponentPropsWithoutRef<typeof RadixSwitch.Root>;

export const Switch = forwardRef<ElementRef<typeof RadixSwitch.Root>, SwitchProps>(
  ({ className, ...props }, ref) => (
    <RadixSwitch.Root
      ref={ref}
      className={cn(
        'relative h-6 w-10 rounded-[12px] border border-line-strong bg-canvas',
        'transition-colors duration-[var(--duration-fast)] ease-out',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    >
      <RadixSwitch.Thumb
        className={cn(
          'block h-4 w-4 translate-x-1 rounded-[8px] bg-surface shadow-float',
          'transition-transform duration-[var(--duration-fast)] ease-out',
          'data-[state=checked]:translate-x-5',
        )}
      />
    </RadixSwitch.Root>
  ),
);
Switch.displayName = 'Switch';
