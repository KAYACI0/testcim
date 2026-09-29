'use client';

import { Command as Cmdk } from 'cmdk';
import { useState } from 'react';

import { Icon } from './icon';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

import { cn } from '@/lib/cn';

export interface ComboboxOption {
  readonly value: string;
  readonly label: string;
}

export interface ComboboxProps {
  readonly options: readonly ComboboxOption[];
  readonly value: string | null;
  readonly onValueChange: (value: string) => void;
  readonly placeholder: string;
  readonly searchPlaceholder: string;
  readonly emptyMessage: string;
  readonly className?: string;
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-control border border-line-strong',
            'bg-surface px-3 text-sm text-ink transition-colors duration-[var(--duration-fast)] outline-none',
            'ease-out focus-visible:border-accent',
            !selected && 'text-ink-3',
            className,
          )}
        >
          {selected?.label ?? placeholder}
          <Icon name="caret-down" size={16} className="text-ink-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Cmdk className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-line px-3">
            <Icon name="magnifying-glass" size={16} className="text-ink-3" />
            <Cmdk.Input
              placeholder={searchPlaceholder}
              className="h-10 w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
            />
          </div>
          <Cmdk.List className="max-h-64 overflow-y-auto py-1">
            <Cmdk.Empty className="px-3 py-2 text-sm text-ink-2">{emptyMessage}</Cmdk.Empty>
            {options.map((option) => (
              <Cmdk.Item
                key={option.value}
                value={option.label}
                onSelect={() => {
                  onValueChange(option.value);
                  setOpen(false);
                }}
                className={cn(
                  'flex cursor-pointer items-center rounded-[4px] px-3 py-2 text-sm text-ink',
                  'data-[selected=true]:bg-canvas',
                )}
              >
                {option.label}
              </Cmdk.Item>
            ))}
          </Cmdk.List>
        </Cmdk>
      </PopoverContent>
    </Popover>
  );
}
