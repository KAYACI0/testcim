import { NextResponse } from 'next/server';

import { mobileCaptureSubmitSchema } from '@testcim/shared';

import type { NextRequest } from 'next/server';

import { submitCaptureQuestionAction } from '@/features/capture/session.server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);

  const parsed = mobileCaptureSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: 'invalid_input', issues: parsed.error.issues },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const result = await submitCaptureQuestionAction(parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason ?? 'submit_failed' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  return NextResponse.json(result, { headers: CORS_HEADERS });
}
