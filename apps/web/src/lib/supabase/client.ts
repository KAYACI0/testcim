'use client';

import { createBrowserClient } from '@supabase/ssr';

import type { Database } from './types';

import { clientEnv } from '@/lib/env.client';

/**
 * One client per module load is fine: `createBrowserClient` caches the
 * underlying auth client internally, so calling this repeatedly from many
 * components does not open extra connections.
 */
export function createClient() {
  return createBrowserClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
