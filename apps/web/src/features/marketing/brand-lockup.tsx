import { LogoMark } from '@/components/patterns/logo';

/** Icon mark beside the wordmark; the full logo file is too padded to read at header size. */
export function BrandLockup() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark className="h-8 w-8" />
      <span className="text-xl font-semibold tracking-[-0.01em] text-ink">Testcim</span>
    </span>
  );
}
