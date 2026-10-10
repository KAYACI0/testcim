'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { BrandLockup } from './brand-lockup';

import type { CSSProperties } from 'react';

import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/cn';

const LINKS = [
  { href: '/features', key: 'features' },
  { href: '/pricing', key: 'pricing' },
  { href: '/help', key: 'help' },
] as const;

/**
 * Sticky marketing header. It gains a line once the page scrolls and shows reading
 * progress as a thin accent line. Below md the links fold into a disclosure menu.
 */
export function SiteHeader() {
  const t = useTranslations('marketing.nav');
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const progressRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frame = 0;
    function update() {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      setScrolled(window.scrollY > 8);
      progressRef.current?.style.setProperty('--progress', String(progress));
    }
    function onScroll() {
      if (!frame) {
        frame = requestAnimationFrame(update);
      }
    }
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header
      className={cn(
        'sticky top-0 z-40 bg-surface transition-[border-color] duration-[var(--duration-slow)]',
        'border-b',
        scrolled || open ? 'border-line' : 'border-transparent',
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="Testcim" className="shrink-0">
          <BrandLockup />
        </Link>

        <nav aria-label={t('label')} className="hidden items-center gap-8 text-base md:flex">
          {LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className="text-ink-2 transition-colors hover:text-ink"
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden h-10 items-center px-3 text-base text-ink hover:underline sm:inline-flex"
          >
            {t('login')}
          </Link>
          <Link
            href="/login"
            className="inline-flex h-10 items-center rounded-control bg-accent px-4 text-base font-medium text-surface transition-colors hover:bg-accent-hover"
          >
            {t('signup')}
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-control text-ink hover:bg-canvas md:hidden"
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? t('closeMenu') : t('menu')}
            onClick={() => setOpen((value) => !value)}
          >
            <Icon name={open ? 'x' : 'list-bullets'} size={22} />
          </button>
        </div>
      </div>

      <div
        id="site-menu"
        hidden={!open}
        className="border-t border-line bg-surface px-4 pt-2 pb-4 md:hidden"
      >
        <nav aria-label={t('label')} className="flex flex-col text-lg">
          {LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className="border-b border-line py-3 text-ink"
              onClick={() => setOpen(false)}
            >
              {t(link.key)}
            </Link>
          ))}
          <Link href="/login" className="py-3 text-ink" onClick={() => setOpen(false)}>
            {t('login')}
          </Link>
        </nav>
      </div>

      <span
        ref={progressRef}
        aria-hidden="true"
        className="read-progress absolute inset-x-0 bottom-[-1px] block h-0.5 bg-accent"
        style={{ '--progress': 0 } as CSSProperties}
      />
    </header>
  );
}
