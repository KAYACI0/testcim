import { cn } from '@/lib/cn';

export interface ProgressProps {
  readonly value: number;
  readonly max?: number;
  readonly label: string;
  readonly className?: string;
}

export function Progress({ value, max = 100, label, className }: ProgressProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn('h-1 w-full overflow-hidden bg-line', className)}
    >
      <div
        className="h-full bg-accent transition-[width] duration-[var(--duration-base)] ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
