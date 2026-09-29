'use client';

import { forwardRef } from 'react';

import { FIELD_BASE } from './input';

import type { TextareaHTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  readonly invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid = false, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        FIELD_BASE,
        'h-auto min-h-20 resize-y py-2',
        invalid ? 'border-err' : 'border-line-strong',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
