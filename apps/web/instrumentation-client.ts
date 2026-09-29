import * as Sentry from '@sentry/nextjs';

import { dataCollection, tracesSampleRate } from './sentry.shared';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({ dsn, tracesSampleRate, dataCollection });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
