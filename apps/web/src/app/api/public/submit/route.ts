import { NextResponse } from 'next/server';

import { publicSubmissionSchema } from '@testcim/shared';

import type { NextRequest } from 'next/server';

import { checkRateLimit, clientIp } from '@/features/online-exam/anon.server';
import { sendContactNotification } from '@/lib/email/notifications.server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!(await checkRateLimit(`public-form:${ip}`, 5, 600))) {
    return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = publicSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: 'invalid_input' }, { status: 400 });
  }

  const { kind, name, email, subject, body: message, contentUrl } = parsed.data;
  const { error } = await createAdminClient()
    .from('public_submissions')
    .insert({ kind, name, email, subject, body: message, content_url: contentUrl ?? null });

  if (error) {
    return NextResponse.json({ ok: false, reason: 'failed' }, { status: 500 });
  }

  // The row is the source of truth; a failed or skipped notification must not fail the form.
  await sendContactNotification({ kind, name, email, subject, body: message, contentUrl });

  return NextResponse.json({ ok: true });
}
