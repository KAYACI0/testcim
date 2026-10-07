/**
 * Resend adapter (docs/02-mimari.md section 2). Plain `fetch` against the documented
 * `POST https://api.resend.com/emails` endpoint, so there is no SDK to keep current and
 * the transport is injectable for tests. No React or Next imports: this stays pure.
 */

export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
  readonly replyTo?: string;
  /** Resend keeps an idempotency key for 24 hours, which makes a retried send safe. */
  readonly idempotencyKey?: string;
}

export type EmailResult =
  | { readonly ok: true; readonly id: string }
  | { readonly ok: false; readonly reason: 'not_configured' | 'rejected' | 'network' };

export interface EmailSender {
  send(message: EmailMessage): Promise<EmailResult>;
}

export interface ResendConfig {
  readonly apiKey: string | undefined;
  readonly from: string | undefined;
  readonly fetch?: typeof fetch;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/** Without a key or sender address the sender reports `not_configured` instead of throwing. */
export function createEmailSender(config: ResendConfig): EmailSender {
  const fetchImpl = config.fetch ?? fetch;

  return {
    async send(message) {
      if (!config.apiKey || !config.from) {
        return { ok: false, reason: 'not_configured' };
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      };
      if (message.idempotencyKey) {
        headers['Idempotency-Key'] = message.idempotencyKey.slice(0, 256);
      }

      try {
        const response = await fetchImpl(RESEND_ENDPOINT, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            from: config.from,
            to: message.to,
            subject: message.subject,
            text: message.text,
            html: message.html,
            ...(message.replyTo ? { reply_to: message.replyTo } : {}),
          }),
        });

        if (!response.ok) {
          return { ok: false, reason: 'rejected' };
        }

        const data = (await response.json().catch(() => null)) as { id?: unknown } | null;
        return { ok: true, id: typeof data?.id === 'string' ? data.id : '' };
      } catch {
        return { ok: false, reason: 'network' };
      }
    },
  };
}

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** User-supplied text (names, subjects, messages) must never reach the HTML body raw. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

export interface EmailLayoutInput {
  readonly paragraphs: readonly string[];
  readonly action?: { readonly label: string; readonly url: string };
}

/** Minimal transactional layout: white page, one text column, one optional action link. */
export function renderEmail(input: EmailLayoutInput): { text: string; html: string } {
  const text = [
    ...input.paragraphs,
    ...(input.action ? [`${input.action.label}: ${input.action.url}`] : []),
  ].join('\n\n');

  const paragraphs = input.paragraphs
    .map((p) => `<p style="margin:0 0 16px">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
  const action = input.action
    ? `<p style="margin:0 0 16px"><a href="${escapeHtml(input.action.url)}">${escapeHtml(input.action.label)}</a></p>`
    : '';

  const html = `<!doctype html><html lang="tr"><body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5"><div style="max-width:560px">${paragraphs}${action}</div></body></html>`;
  return { text, html };
}
