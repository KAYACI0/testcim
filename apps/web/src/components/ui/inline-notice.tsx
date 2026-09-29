import { Icon } from './icon';

import type { IconName } from './icon';
import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export type NoticeTone = 'neutral' | 'ok' | 'err' | 'warn';

const TONES: Record<NoticeTone, { classes: string; icon: IconName }> = {
  neutral: { classes: 'border-line-strong bg-canvas text-ink', icon: 'clipboard-text' },
  ok: { classes: 'border-ok/30 bg-ok-tint text-ok', icon: 'check-circle' },
  err: { classes: 'border-err/30 bg-err-tint text-err', icon: 'warning-circle' },
  warn: { classes: 'border-warn/30 bg-warn-tint text-warn', icon: 'warning' },
};

export interface InlineNoticeProps extends HTMLAttributes<HTMLDivElement> {
  readonly tone?: NoticeTone;
}

export function InlineNotice({
  className,
  tone = 'neutral',
  children,
  ...props
}: InlineNoticeProps) {
  const { classes, icon } = TONES[tone];

  return (
    <div
      role={tone === 'err' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-control border px-3 py-2 text-sm',
        classes,
        className,
      )}
      {...props}
    >
      <Icon name={icon} size={16} className="mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}
