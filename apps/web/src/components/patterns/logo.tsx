'use client';

import { useState } from 'react';

import { cn } from '@/lib/cn';

/**
 * `onError` fallback handles the case where the brand asset is ever removed from
 * `public/brand` — reading the filesystem at request time isn't reliable once this
 * runs as a Vercel serverless function, and bundling fs into this module also breaks
 * the client build for any client component that renders it.
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
    // eslint-disable-next-line @next/next/no-img-element -- brand svg, not an optimizable photo
    <img
      src="/brand/logo.svg"
      alt="Testcim"
      className={cn('h-9 w-auto', className)}
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
    <span className={cn('block h-6 w-6 overflow-hidden', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- brand svg, pre-cropped to the icon mark */}
      <img
        src="/brand/icon-mark.svg"
        alt="Testcim"
        className="h-full w-full object-contain"
        onError={() => setMissing(true)}
      />
    </span>
  );
}
