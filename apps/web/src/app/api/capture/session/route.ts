import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

import { getMobileCaptureSessionAction } from '@/features/capture/session.server';
import { checkRateLimit, clientIp } from '@/features/online-exam/anon.server';

export const dynamic = 'force-dynamic';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const ip = clientIp(request);
  if (!(await checkRateLimit(`capture-session:${ip}`, 60, 60))) {
    return NextResponse.json(
      { ok: false, reason: 'rate_limited' },
      { status: 429, headers: CORS_HEADERS },
    );
  }

  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json(
      { ok: false, reason: 'missing_token' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const result = await getMobileCaptureSessionAction(token);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, reason: result.reason ?? 'invalid_token' },
      { status: 401, headers: CORS_HEADERS },
    );
  }

  return NextResponse.json(result, { headers: CORS_HEADERS });
}
