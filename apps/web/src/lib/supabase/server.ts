import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from './types';

import { clientEnv } from '@/lib/env.client';

/**
 * Server Component / Server Action / Route Handler client. Reads and writes
 * session cookies through the Next.js `cookies()` store.
 *
 * `setAll` can throw when called from a Server Component (cookies are
 * read-only there); it is swallowed because the proxy already refreshes the
 * session on every request, so a failed write here just means "unchanged".
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component; ignored, see doc comment above.
          }
        },
      },
    },
  );
}
