'use client';

import { useEffect } from 'react';

import { COOKIE_CONSENT_EVENT, COOKIE_CONSENT_STORAGE_KEY } from './cookie-consent';

/**
 * Product analytics (PostHog), loaded only after the visitor accepts cookies.
 * Without consent, or without a configured key, nothing is imported or
 * requested: the library code is not even downloaded.
 */
export function Analytics() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    let started = false;

    async function start() {
      if (started || !key) {
        return;
      }
      if (window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) !== 'accepted') {
        return;
      }
      started = true;
      const { default: posthog } = await import('posthog-js');
      posthog.init(key, {
        ...(host ? { api_host: host } : {}),
        disable_session_recording: true,
      });
    }

    const onConsent = () => {
      void start();
    };

    void start();
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
  }, []);

  return null;
}
