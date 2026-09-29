import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';

export interface Session {
  readonly userId: string;
  readonly email: string | undefined;
}

/**
 * Reads the current session from the (proxy-refreshed) auth cookie. Uses
 * `getClaims()` rather than `getUser()`: it verifies the JWT locally against
 * Supabase's signing keys instead of making a network round trip, per the
 * Supabase Auth server-side guide's recommendation for protecting pages.
 * Memoized with React `cache()` so a render pass that calls this from several
 * Server Components only decodes the cookie once.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims) {
    return null;
  }

  return { userId: claims.sub, email: typeof claims.email === 'string' ? claims.email : undefined };
});

/** Same as `getSession`, but redirects to `/login` instead of returning null. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  return session;
}
