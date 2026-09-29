import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'ok' | 'err' | 'warn' | 'accent';

const TONES: Record<BadgeTone, string> = {
  neutral: 'border-line-strong text-ink-2',
  ok: 'border-ok/30 bg-ok-tint text-ok',
  err: 'border-err/30 bg-err-tint text-err',
  warn: 'border-warn/30 bg-warn-tint text-warn',
  accent: 'border-accent/30 bg-accent-tint text-accent',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone?: BadgeTone;
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-control border px-2 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
