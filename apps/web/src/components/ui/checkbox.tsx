'use client';

import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { forwardRef } from 'react';

import { Icon } from './icon';

import type { ComponentPropsWithoutRef, ElementRef } from 'react';

import { cn } from '@/lib/cn';

export type CheckboxProps = ComponentPropsWithoutRef<typeof RadixCheckbox.Root>;

export const Checkbox = forwardRef<ElementRef<typeof RadixCheckbox.Root>, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <RadixCheckbox.Root
      ref={ref}
      className={cn(
        'flex h-5 w-5 items-center justify-center rounded-[4px] border border-line-strong bg-surface',
        'transition-colors duration-[var(--duration-fast)] ease-out',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    >
      <RadixCheckbox.Indicator>
        <Icon name="check" size={14} className="text-surface" />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  ),
);
Checkbox.displayName = 'Checkbox';
