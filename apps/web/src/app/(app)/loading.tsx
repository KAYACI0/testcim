import { getTranslations } from 'next-intl/server';

/**
 * Shown the instant a link is clicked, while the next page's data loads. It is
 * also what Next prefetches for dynamic routes, so navigation commits without
 * waiting for the server. Static blocks only: motion is reserved for user actions.
 */
export default async function AppLoading() {
  const t = await getTranslations('common');

  return (
    <div role="status" aria-busy="true" className="flex h-full flex-col">
      <span className="sr-only">{t('loading')}</span>
      <div className="flex flex-col gap-3 border-b border-line px-6 py-5">
        <div className="h-7 w-48 rounded-control bg-line" />
        <div className="h-4 w-80 max-w-full rounded-control bg-canvas" />
      </div>
      <div className="flex flex-col gap-3 p-6">
        <div className="h-10 w-full rounded-control bg-canvas" />
        <div className="h-10 w-full rounded-control bg-canvas" />
        <div className="h-10 w-full rounded-control bg-canvas" />
        <div className="h-10 w-2/3 rounded-control bg-canvas" />
      </div>
    </div>
  );
}
