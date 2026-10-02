import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

import { getMobileSignedUploadUrlAction } from '@/features/capture/session.server';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    token?: string;
    ext?: string;
  } | null;

  if (!body || typeof body.token !== 'string') {
    return NextResponse.json(
      { ok: false, reason: 'missing_token' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const result = await getMobileSignedUploadUrlAction(body.token, body.ext ?? 'png');
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason ?? 'failed' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  return NextResponse.json(result, { headers: CORS_HEADERS });
}
