import { getRequestConfig } from 'next-intl/server';

import { DEFAULT_LOCALE } from '@testcim/shared';

/**
 * Single-locale setup (no i18n routing). Turkish is the default and the source of truth;
 * English messages are kept in step. Locale negotiation arrives with account settings.
 */
export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  const messages = (await import(`../../messages/${locale}.json`)) as {
    default: Record<string, unknown>;
  };

  return { locale, messages: messages.default };
});
