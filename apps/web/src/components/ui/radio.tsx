'use client';

import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import { forwardRef } from 'react';

import type { ComponentPropsWithoutRef, ElementRef } from 'react';

import { cn } from '@/lib/cn';

export const RadioGroup = RadixRadioGroup.Root;

export type RadioItemProps = ComponentPropsWithoutRef<typeof RadixRadioGroup.Item>;

export const RadioItem = forwardRef<ElementRef<typeof RadixRadioGroup.Item>, RadioItemProps>(
  ({ className, ...props }, ref) => (
    <RadixRadioGroup.Item
      ref={ref}
      className={cn(
        'flex h-5 w-5 items-center justify-center rounded-[10px] border border-line-strong bg-surface',
        'transition-colors duration-[var(--duration-fast)] ease-out',
        'data-[state=checked]:border-accent',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    >
      <RadixRadioGroup.Indicator className="h-2.5 w-2.5 rounded-[6px] bg-accent" />
    </RadixRadioGroup.Item>
  ),
);
RadioItem.displayName = 'RadioItem';
