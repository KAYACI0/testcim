import 'server-only';

import { getTranslations } from 'next-intl/server';

import { getEmailSender } from './email.server';
import { renderEmail, type EmailResult } from './resend';

import { serverEnv } from '@/lib/env.server';
import { absoluteUrl } from '@/lib/site';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Transactional emails (docs/04-yol-haritasi.md, Faz 2). Each function resolves its copy
 * from `messages/*.json` (`email.*`) and never throws: a failed or skipped send returns a
 * result the caller may ignore, because every flow also has an in-app fallback.
 */

export async function sendInviteEmail(input: {
  readonly to: string;
  readonly token: string;
  readonly role: 'admin' | 'editor' | 'viewer';
  readonly workspaceName: string;
  readonly inviterName: string | null;
}): Promise<EmailResult> {
  const t = await getTranslations('email');
  const { text, html } = renderEmail({
    paragraphs: [
      t('invite.intro', {
        inviter: input.inviterName ?? t('fallbackName'),
        workspace: input.workspaceName,
        role: t(`invite.roles.${input.role}`),
      }),
      t('invite.expiry'),
    ],
    action: { label: t('invite.action'), url: absoluteUrl(`/invite/${input.token}`) },
  });

  return getEmailSender().send({
    to: input.to,
    subject: t('invite.subject', { workspace: input.workspaceName }),
    text,
    html,
    idempotencyKey: `invite:${input.token.slice(0, 32)}`,
  });
}

export async function sendContactNotification(input: {
  readonly kind: 'contact' | 'copyright';
  readonly name: string;
  readonly email: string;
  readonly subject: string;
  readonly body: string;
  readonly contentUrl?: string | null | undefined;
}): Promise<EmailResult> {
  const to = serverEnv.CONTACT_NOTIFY_TO;
  if (!to) return { ok: false, reason: 'not_configured' };

  const t = await getTranslations('email');
  const kind = t(`contact.kinds.${input.kind}`);
  const { text, html } = renderEmail({
    paragraphs: [
      t('contact.intro', { name: input.name, email: input.email, kind }),
      input.subject,
      input.body,
      ...(input.contentUrl ? [input.contentUrl] : []),
    ],
  });

  return getEmailSender().send({
    to,
    subject: t('contact.subject', { kind, subject: input.subject }),
    text,
    html,
    replyTo: input.email,
  });
}

export async function sendMentionEmail(input: {
  readonly recipientUserId: string;
  readonly commentId: string;
  readonly authorName: string | null;
  readonly testId: string;
  readonly testTitle: string;
}): Promise<EmailResult> {
  const { data } = await createAdminClient().auth.admin.getUserById(input.recipientUserId);
  const to = data.user?.email;
  if (!to) return { ok: false, reason: 'not_configured' };

  const t = await getTranslations('email');
  const author = input.authorName ?? t('fallbackName');
  const { text, html } = renderEmail({
    paragraphs: [t('mention.intro', { author, test: input.testTitle })],
    action: { label: t('mention.action'), url: absoluteUrl(`/tests/${input.testId}`) },
  });

  return getEmailSender().send({
    to,
    subject: t('mention.subject', { author }),
    text,
    html,
    idempotencyKey: `mention:${input.commentId}:${input.recipientUserId}`,
  });
}
