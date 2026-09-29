import * as Sentry from '@sentry/nextjs';

import { dataCollection, tracesSampleRate } from './sentry.shared';

// No DSN means no Sentry. A fresh clone runs without an account.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({ dsn, tracesSampleRate, dataCollection });
}
