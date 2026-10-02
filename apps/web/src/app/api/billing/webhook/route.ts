import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

import { WebhookSignatureError } from '@/features/billing/provider';
import { getBillingProvider } from '@/features/billing/registry.server';
import { handleWebhook } from '@/features/billing/webhook.server';

// The signature covers the exact bytes received, so the body is read as text
// and never re-serialized before verification.
export async function POST(request: NextRequest) {
  const provider = getBillingProvider();

  if (!provider) {
    return NextResponse.json({ ok: false, reason: 'billing_disabled' }, { status: 404 });
  }

  const rawBody = await request.text();

  try {
    const results = await handleWebhook(provider, rawBody, request.headers);
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    if (error instanceof WebhookSignatureError) {
      return NextResponse.json({ ok: false, reason: 'invalid_signature' }, { status: 401 });
    }
    // A 5xx makes the provider redeliver, which is what we want for a DB outage.
    return NextResponse.json({ ok: false, reason: 'processing_failed' }, { status: 500 });
  }
}
