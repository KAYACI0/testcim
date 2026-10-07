import 'server-only';

import { createEmailSender, type EmailSender } from './resend';

import { serverEnv } from '@/lib/env.server';

/** The process-wide sender, built from the server environment. */
export function getEmailSender(): EmailSender {
  return createEmailSender({ apiKey: serverEnv.RESEND_API_KEY, from: serverEnv.EMAIL_FROM });
}
