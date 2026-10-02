import { NextResponse, type NextRequest } from 'next/server';

import { isMarketingPath } from '@/lib/site';
import { updateSession } from '@/lib/supabase/proxy';

export async function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  const analyticsHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? '';

  const cspHeader = [
    "default-src 'self'",
    isDev
      ? `script-src 'self' 'unsafe-eval' 'nonce-${nonce}'`
      : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://*.supabase.co",
    "font-src 'self' data:",
    [
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.sentry.io",
      analyticsHost,
    ]
      .filter(Boolean)
      .join(' '),
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  // Public marketing pages stay cookie-free so they can be cached as static output.
  if (isMarketingPath(request.nextUrl.pathname)) {
    const response = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    response.headers.set('Content-Security-Policy', cspHeader);
    return response;
  }

  const response = await updateSession(request, requestHeaders);
  response.headers.set('Content-Security-Policy', cspHeader);
  return response;
}

export const config = {
  matcher: [
    // Skip static assets, image optimization, and API routes (routes handle
    // their own auth so a matcher change there can't silently disable it).
    '/((?!_next/static|_next/image|api|favicon.ico|brand/).*)',
  ],
};
