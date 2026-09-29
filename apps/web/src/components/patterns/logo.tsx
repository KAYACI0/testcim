'use client';

import { useState } from 'react';

import { cn } from '@/lib/cn';

/**
 * Brand SVGs are optional (docs/03 section 7: the brand owner supplies them later).
 * Existence can't be checked with node:fs here — reading `public/` at request time isn't
 * reliable once this runs as a Vercel serverless function, and bundling fs into this
 * module also breaks the client build for any client component that renders it. An
 * `onError` fallback is the standard, environment-independent way to detect a missing
 * static asset.
 */

export interface LogoProps {
  readonly className?: string;
}

export function Logo({ className }: LogoProps) {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return <span className={cn('text-lg font-semibold text-ink', className)}>Testcim</span>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- brand SVG, not an optimizable photo
    <img
      src="/brand/logo.svg"
      alt="Testcim"
      className={cn('h-6', className)}
      onError={() => setMissing(true)}
    />
  );
}

export interface LogoMarkProps {
  readonly className?: string;
}

export function LogoMark({ className }: LogoMarkProps) {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <span
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-[4px] bg-accent text-sm font-semibold text-surface',
          className,
        )}
        aria-hidden="true"
      >
        T
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- brand SVG, not an optimizable photo
    <img
      src="/brand/mark.svg"
      alt="Testcim"
      className={cn('h-6 w-6', className)}
      onError={() => setMissing(true)}
    />
  );
}
