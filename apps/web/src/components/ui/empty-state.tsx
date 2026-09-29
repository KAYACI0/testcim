import type { ReactNode } from 'react';

export interface EmptyStateProps {
  readonly message: string;
  readonly action?: ReactNode;
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-3 py-12 text-sm text-ink-2">
      <p>{message}</p>
      {action}
    </div>
  );
}
