import type { ReactNode } from 'react';

/**
 * Every marketing page except home sits on one white paper sheet on the blue desk,
 * so its reading text keeps the application's ink-on-white styling.
 */
export default function ContentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6">
      <div className="sheet rounded-dialog bg-surface text-base text-ink">{children}</div>
    </div>
  );
}
