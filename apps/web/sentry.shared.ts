import type { init } from '@sentry/nextjs';

// @sentry/nextjs does not re-export the DataCollection type, so derive it from init().
type DataCollection = NonNullable<NonNullable<Parameters<typeof init>[0]>['dataCollection']>;

/**
 * Sentry 11 collects personal data by default (it replaced sendDefaultPii with
 * dataCollection and inverted the default). KVKK and docs/02-mimari.md section 7 require
 * the opposite, so every category is opted out explicitly here.
 */
export const dataCollection: DataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
};

export const tracesSampleRate = process.env.NODE_ENV === 'production' ? 0.1 : 1;
