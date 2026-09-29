import type { ReactNode } from 'react';

export interface PageHeaderProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-line px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-2">{description}</p>}
      </div>
      {action}
    </div>
  );
}
