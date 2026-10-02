import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import type { Database } from './types';

import { clientEnv } from '@/lib/env.client';
import { isMarketingPath } from '@/lib/site';

const PUBLIC_PATHS = ['/login', '/auth', '/design-system'];

function isPublicPath(pathname: string): boolean {
  return (
    isMarketingPath(pathname) ||
    PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  );
}

/**
 * Refreshes the Supabase session cookie on every request and does an
 * optimistic redirect for signed-out visitors hitting a protected path.
 * This is a fast, cookie-only check (docs/app/guides/authentication.md,
 * "Optimistic checks with Proxy") — real authorization still happens per
 * request via RLS and `requireRole`/`requireEntitlement` on the server.
 */
export async function updateSession(request: NextRequest, requestHeaders?: Headers) {
  const headers = requestHeaders ?? request.headers;
  let response = NextResponse.next({ request: { headers } });

  const supabase = createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request: { headers } });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const { pathname } = request.nextUrl;

  if (!claims && !isPublicPath(pathname)) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
