'use client';

import { useId } from 'react';

import type { ReactElement } from 'react';

import { cn } from '@/lib/cn';

export interface FormFieldProps {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly children: (fieldProps: {
    id: string;
    'aria-describedby': string | undefined;
  }) => ReactElement;
}

export function FormField({ label, hint, error, required = false, children }: FormFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required && <span className="text-err"> *</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-2">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className={cn('text-xs text-err')}>
          {error}
        </p>
      )}
    </div>
  );
}
