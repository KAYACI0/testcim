'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '../ui/button';

export const COOKIE_CONSENT_STORAGE_KEY = 'tc_cookie_consent';

/** Fired on `window` when the visitor makes a choice, so analytics can start without a reload. */
export const COOKIE_CONSENT_EVENT = 'tc:cookie-consent';

type Consent = 'accepted' | 'necessary_only';

/**
 * Gates non-essential analytics (PostHog, docs/02 §2) behind an explicit
 * choice. Necessary cookies (the Supabase auth session) aren't covered by
 * this banner — they're required for the product to function.
 */
export function CookieConsent() {
  const t = useTranslations('cookieConsent');
  const [consent, setConsent] = useState<Consent | null>('accepted');

  useEffect(() => {
    // Reads a browser-only API unavailable during SSR, so this can't be a
    // lazy `useState` initializer; the resulting one-time extra render is
    // the intended way to reconcile with an external, non-reactive store.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) as Consent | null);
  }, []);

  if (consent) {
    return null;
  }

  function choose(value: Consent) {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, value);
    setConsent(value);
    window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-6 py-4 shadow-float">
      <div className="mx-auto flex max-w-3xl flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-sm text-ink-2">{t('message')}</p>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={() => choose('necessary_only')}>
            {t('necessaryOnly')}
          </Button>
          <Button size="sm" onClick={() => choose('accepted')}>
            {t('accept')}
          </Button>
        </div>
      </div>
    </div>
  );
}
