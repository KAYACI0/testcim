import { InlineNotice } from '../ui/inline-notice';

import type { ReactNode } from 'react';

export interface UpgradeNoteProps {
  readonly message: string;
  readonly action?: ReactNode;
}

/** A non-blocking, inline nudge toward a higher plan. Never a modal. */
export function UpgradeNote({ message, action }: UpgradeNoteProps) {
  return (
    <InlineNotice tone="warn">
      <div className="flex items-center justify-between gap-3">
        <span>{message}</span>
        {action}
      </div>
    </InlineNotice>
  );
}
