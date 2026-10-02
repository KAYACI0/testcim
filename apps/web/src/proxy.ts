import { NextResponse, type NextRequest } from 'next/server';

import { isMarketingPath } from '@/lib/site';
import { updateSession } from '@/lib/supabase/proxy';

export function proxy(request: NextRequest) {
  // Public marketing pages stay cookie-free so they can be cached as static output.
  if (isMarketingPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, image optimization, and API routes (routes handle
    // their own auth so a matcher change there can't silently disable it).
    '/((?!_next/static|_next/image|api|favicon.ico|brand/).*)',
  ],
};
