import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { ReactNode } from 'react';

import { LogoMark } from '@/components/patterns/logo';
import { MARKETING_PAGES } from '@/lib/site';

const FOOTER_GROUPS = [
  { key: 'productTitle', pages: ['features', 'pricing', 'help', 'changelog', 'status'] },
  { key: 'companyTitle', pages: ['about', 'contact'] },
  { key: 'legalTitle', pages: ['privacy', 'kvkk', 'terms', 'refund', 'copyright'] },
] as const;

/**
 * Marketing chrome: the blue desk. Pages lay white paper sheets on it; the home page
 * composes its own sheets, the `(content)` group wraps every other page in one.
 */
export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('marketing');
  const tp = await getTranslations('marketing.pages');
  const hrefOf = (key: string) => MARKETING_PAGES.find((page) => page.key === key)?.path ?? '/';

  return (
    <div className="on-brand flex min-h-screen flex-col bg-brand text-lg text-surface">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-ink"
      >
        {t('skipToContent')}
      </a>

      <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4 pt-6 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 text-surface">
          <span className="flex h-9 w-9 items-center justify-center rounded-control bg-surface">
            <LogoMark />
          </span>
          <span className="text-xl font-semibold tracking-[-0.01em]">Testcim</span>
        </Link>
        <nav
          aria-label={t('nav.label')}
          className="flex flex-wrap items-center gap-x-7 gap-y-2 text-base"
        >
          <Link href="/features" className="text-on-brand-2 hover:text-surface">
            {t('nav.features')}
          </Link>
          <Link href="/pricing" className="text-on-brand-2 hover:text-surface">
            {t('nav.pricing')}
          </Link>
          <Link href="/help" className="text-on-brand-2 hover:text-surface">
            {t('nav.help')}
          </Link>
          <Link href="/login" className="text-surface hover:underline">
            {t('nav.login')}
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center rounded-control bg-surface px-4 font-medium text-accent-hover hover:bg-accent-tint"
          >
            {t('nav.signup')}
          </Link>
        </nav>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pt-24 pb-12 text-base sm:px-6">
        <div className="flex flex-wrap justify-between gap-10 border-t border-brand-line pt-10">
          <div className="max-w-xs">
            <p className="text-xl font-semibold">Testcim</p>
            <p className="mt-2 text-on-brand-3">{t('footer.note')}</p>
          </div>
          <nav aria-label={t('footer.label')} className="flex flex-wrap gap-x-16 gap-y-10">
            {FOOTER_GROUPS.map((group) => (
              <div key={group.key}>
                <h2 className="font-semibold">{t(`footer.${group.key}`)}</h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {group.pages.map((page) => (
                    <li key={page}>
                      <Link href={hrefOf(page)} className="text-on-brand-2 hover:text-surface">
                        {tp(`${page}.title`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
