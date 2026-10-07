import { describe, expect, it, vi } from 'vitest';

import { createEmailSender, escapeHtml, renderEmail } from './resend';

const MESSAGE = { to: 'a@example.com', subject: 'Konu', text: 'metin', html: '<p>metin</p>' };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe('createEmailSender', () => {
  it('reports not_configured without a key or sender and does not call the network', async () => {
    const fetchImpl = vi.fn();

    for (const config of [
      { apiKey: undefined, from: 'Testcim <a@b.co>' },
      { apiKey: 're_x', from: undefined },
    ]) {
      const result = await createEmailSender({ ...config, fetch: fetchImpl }).send(MESSAGE);
      expect(result).toEqual({ ok: false, reason: 'not_configured' });
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts the documented body with bearer auth and idempotency key', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ id: 'mail-1' }));
    const sender = createEmailSender({
      apiKey: 're_x',
      from: 'Testcim <a@b.co>',
      fetch: fetchImpl,
    });

    const result = await sender.send({
      ...MESSAGE,
      replyTo: 'r@example.com',
      idempotencyKey: 'k1',
    });

    expect(result).toEqual({ ok: true, id: 'mail-1' });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer re_x',
      'Idempotency-Key': 'k1',
    });
    expect(JSON.parse(init.body as string)).toEqual({
      from: 'Testcim <a@b.co>',
      to: 'a@example.com',
      subject: 'Konu',
      text: 'metin',
      html: '<p>metin</p>',
      reply_to: 'r@example.com',
    });
  });

  it('maps an API error and a network failure to distinct reasons', async () => {
    const rejected = createEmailSender({
      apiKey: 're_x',
      from: 'a@b.co',
      fetch: vi.fn().mockResolvedValue(jsonResponse({ message: 'bad' }, 422)),
    });
    const broken = createEmailSender({
      apiKey: 're_x',
      from: 'a@b.co',
      fetch: vi.fn().mockRejectedValue(new Error('offline')),
    });

    expect(await rejected.send(MESSAGE)).toEqual({ ok: false, reason: 'rejected' });
    expect(await broken.send(MESSAGE)).toEqual({ ok: false, reason: 'network' });
  });
});

describe('renderEmail', () => {
  it('escapes user text in the html body but keeps it verbatim in the text body', () => {
    const { text, html } = renderEmail({
      paragraphs: ['<script>alert("x")</script> & co'],
      action: { label: 'Aç', url: 'https://x.test/?a=1&b="2"' },
    });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('href="https://x.test/?a=1&amp;b=&quot;2&quot;"');
    expect(text).toContain('<script>alert("x")</script> & co');
    expect(text).toContain('Aç: https://x.test/?a=1&b="2"');
  });

  it('escapeHtml covers the five special characters', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });
});
