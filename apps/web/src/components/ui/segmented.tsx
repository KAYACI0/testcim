'use client';

import * as RadixToggleGroup from '@radix-ui/react-toggle-group';

import { cn } from '@/lib/cn';

export interface SegmentedOption {
  readonly value: string;
  readonly label: string;
}

export interface SegmentedProps {
  readonly options: readonly SegmentedOption[];
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly 'aria-label': string;
  readonly className?: string;
}

export function Segmented({ options, value, onValueChange, className, ...aria }: SegmentedProps) {
  return (
    <RadixToggleGroup.Root
      type="single"
      value={value}
      onValueChange={(next) => next && onValueChange(next)}
      className={cn('inline-flex rounded-control border border-line-strong p-0.5', className)}
      {...aria}
    >
      {options.map((option) => (
        <RadixToggleGroup.Item
          key={option.value}
          value={option.value}
          className={cn(
            'rounded-[4px] px-3 py-1.5 text-sm text-ink-2 transition-colors',
            'duration-[var(--duration-fast)] ease-out hover:text-ink',
            'data-[state=on]:bg-accent-tint data-[state=on]:text-accent',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          )}
        >
          {option.label}
        </RadixToggleGroup.Item>
      ))}
    </RadixToggleGroup.Root>
  );
}
