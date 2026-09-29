import type { NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/proxy';

export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Skip static assets, image optimization, and API routes (routes handle
    // their own auth so a matcher change there can't silently disable it).
    '/((?!_next/static|_next/image|api|favicon.ico|brand/).*)',
  ],
};
