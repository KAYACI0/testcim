import 'server-only';

import type { createClient } from '@/lib/supabase/server';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface AuditEvent {
  readonly workspaceId: string;
  readonly actorId: string;
  readonly action: string;
  readonly targetType?: string;
  readonly targetId?: string;
  readonly meta?: Record<string, unknown>;
}

/**
 * Records a membership/role/plan change to `audit_log`. Best-effort: a
 * failure here shouldn't roll back the mutation that triggered it, so
 * callers fire-and-forget this rather than awaiting it inline with the
 * mutation's error handling.
 */
export async function writeAuditLog(supabase: SupabaseServerClient, event: AuditEvent) {
  const { error } = await supabase.from('audit_log').insert({
    workspace_id: event.workspaceId,
    actor_id: event.actorId,
    action: event.action,
    target_type: event.targetType ?? null,
    target_id: event.targetId ?? null,
    meta: event.meta ?? {},
  });

  if (error) {
    console.error('audit_log insert failed', event.action, error);
  }
}
