import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { ReactNode } from 'react';

import { Logo } from '@/components/patterns/logo';
import { MARKETING_PAGES } from '@/lib/site';

const FOOTER_GROUPS = [
  { key: 'productTitle', pages: ['features', 'pricing', 'help', 'changelog', 'status'] },
  { key: 'companyTitle', pages: ['about', 'contact'] },
  { key: 'legalTitle', pages: ['privacy', 'kvkk', 'terms', 'refund', 'copyright'] },
] as const;

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations('marketing');
  const tp = await getTranslations('marketing.pages');
  const hrefOf = (key: string) => MARKETING_PAGES.find((page) => page.key === key)?.path ?? '/';

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-ink"
      >
        {t('skipToContent')}
      </a>

      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-3">
          <Link href="/" aria-label="Testcim">
            <Logo />
          </Link>
          <nav
            aria-label={t('nav.label')}
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm"
          >
            <Link href="/features" className="text-ink-2 hover:text-ink">
              {t('nav.features')}
            </Link>
            <Link href="/pricing" className="text-ink-2 hover:text-ink">
              {t('nav.pricing')}
            </Link>
            <Link href="/help" className="text-ink-2 hover:text-ink">
              {t('nav.help')}
            </Link>
            <Link href="/login" className="text-ink hover:underline">
              {t('nav.login')}
            </Link>
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-control bg-accent px-4 font-medium text-surface hover:bg-accent-hover"
            >
              {t('nav.signup')}
            </Link>
          </nav>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
          <nav aria-label={t('footer.label')} className="grid gap-8 sm:grid-cols-3">
            {FOOTER_GROUPS.map((group) => (
              <div key={group.key}>
                <h2 className="text-sm font-semibold text-ink">{t(`footer.${group.key}`)}</h2>
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {group.pages.map((page) => (
                    <li key={page}>
                      <Link href={hrefOf(page)} className="text-ink-2 hover:text-ink">
                        {tp(`${page}.title`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <p className="text-sm text-ink-2">{t('footer.note')}</p>
        </div>
      </footer>
    </div>
  );
}
