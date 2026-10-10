import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import type { ReactNode } from 'react';

import { BrandLockup } from '@/features/marketing/brand-lockup';
import { SiteHeader } from '@/features/marketing/site-header';
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
    <div className="flex min-h-screen flex-col bg-surface text-ink">
      {/* Without scripts nothing would ever reveal; show it all instead. */}
      <noscript>
        <style>{'.reveal{opacity:1!important;transform:none!important}'}</style>
      </noscript>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-control focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:text-ink"
      >
        {t('skipToContent')}
      </a>

      <SiteHeader />

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-4 pt-14 pb-10 sm:px-6">
          <div className="flex flex-wrap justify-between gap-10">
            <div className="max-w-xs">
              <BrandLockup />
              <p className="mt-3 text-ink-2">{t('footer.note')}</p>
            </div>
            <nav aria-label={t('footer.label')} className="flex flex-wrap gap-x-16 gap-y-10">
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
          </div>
          <p className="mt-12 border-t border-line pt-6 text-sm text-ink-3">
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </footer>
    </div>
  );
}
