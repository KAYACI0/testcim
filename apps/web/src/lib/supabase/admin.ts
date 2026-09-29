import 'server-only';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import type { Database } from './types';

import { clientEnv } from '@/lib/env.client';
import { serverEnv } from '@/lib/env.server';

/**
 * Service-role client. Bypasses RLS entirely — use only for flows that have
 * no authenticated user to check membership against (invite-token accept,
 * anonymous exam attempts) and that apply their own authorization by hand.
 * Never import this module from a Client Component.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
