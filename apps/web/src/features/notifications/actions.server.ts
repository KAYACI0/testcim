'use server';

import { requireSession } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';

export interface NotificationRow {
  readonly id: string;
  readonly kind: 'mention' | 'approval_request';
  readonly payload: Record<string, unknown>;
  readonly read_at: string | null;
  readonly created_at: string;
}

const NOTIFICATION_LIST_LIMIT = 30;

/** This user's own notifications, newest first — RLS already scopes to `user_id = auth.uid()`. */
export async function listNotifications(): Promise<NotificationRow[]> {
  await requireSession();
  const supabase = await createClient();

  const { data } = await supabase
    .from('notifications')
    .select('id, kind, payload, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(NOTIFICATION_LIST_LIMIT);
  return data ?? [];
}

export async function markNotificationRead(notificationId: string) {
  await requireSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}
