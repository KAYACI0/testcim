import 'server-only';

import { cache } from 'react';

import { entitlementsSchema, type Entitlements, type WorkspaceRole } from '@testcim/shared';
import { can, isWithinLimit, limit } from '@testcim/shared';

import { createClient } from '@/lib/supabase/server';

export class NotAuthorizedError extends Error {
  constructor(message = 'not_authorized') {
    super(message);
    this.name = 'NotAuthorizedError';
  }
}

export class EntitlementError extends Error {
  constructor(readonly key: string) {
    super(`entitlement_denied:${key}`);
    this.name = 'EntitlementError';
  }
}

/** `plans.entitlements` merged with any per-workspace override, for one workspace. */
export const getEntitlements = cache(async (workspaceId: string): Promise<Entitlements> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_entitlements', { p_ws: workspaceId });

  if (error) {
    throw error;
  }

  return entitlementsSchema.parse(data);
});

/** Throws `NotAuthorizedError` unless the caller holds one of `roles` in `workspaceId`. */
export async function requireRole(workspaceId: string, roles: WorkspaceRole[]): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('has_role', { ws: workspaceId, roles });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new NotAuthorizedError();
  }
}

/** Throws `EntitlementError` unless the boolean entitlement `key` is granted. */
export async function requireFlag(
  workspaceId: string,
  key: Parameters<typeof can>[1],
): Promise<void> {
  const entitlements = await getEntitlements(workspaceId);

  if (!can(entitlements, key)) {
    throw new EntitlementError(key);
  }
}

/** Throws `EntitlementError` unless `current` (usage so far) still fits under the cap for `key`. */
export async function requireUsageWithinLimit(
  workspaceId: string,
  key: Parameters<typeof limit>[1],
  current: number,
): Promise<void> {
  const entitlements = await getEntitlements(workspaceId);

  if (!isWithinLimit(current, limit(entitlements, key))) {
    throw new EntitlementError(key);
  }
}
