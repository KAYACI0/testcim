import { Progress } from '../ui/progress';

import { cn } from '@/lib/cn';

export interface UsageMeterProps {
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly summary: string;
  readonly className?: string;
}

export function UsageMeter({ label, value, max, summary, className }: UsageMeterProps) {
  const nearLimit = value / max >= 0.9;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink-2">{label}</span>
        <span className={cn(nearLimit ? 'text-warn' : 'text-ink-2')}>{summary}</span>
      </div>
      <Progress value={value} max={max} label={label} />
    </div>
  );
}
