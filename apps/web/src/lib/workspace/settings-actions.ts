'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireSession } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/workspace/entitlements.server';

export interface WorkspaceSettingsState {
  readonly status: 'idle' | 'saved' | 'error';
  readonly message?: string;
}

const updateSchema = z.object({
  workspaceId: z.uuid(),
  name: z.string().trim().min(2).max(120),
  schoolName: z.string().trim().max(120).optional(),
});

export async function updateWorkspaceSettings(
  _prev: WorkspaceSettingsState,
  formData: FormData,
): Promise<WorkspaceSettingsState> {
  await requireSession();
  const parsed = updateSchema.safeParse({
    workspaceId: formData.get('workspaceId'),
    name: formData.get('name'),
    schoolName: formData.get('schoolName') || undefined,
  });

  if (!parsed.success) {
    return { status: 'error', message: 'invalid_input' };
  }

  await requireRole(parsed.data.workspaceId, ['owner', 'admin']);

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from('workspaces')
    .select('branding')
    .eq('id', parsed.data.workspaceId)
    .single();

  const { error } = await supabase
    .from('workspaces')
    .update({
      name: parsed.data.name,
      branding: { ...(existing?.branding ?? {}), schoolName: parsed.data.schoolName },
    })
    .eq('id', parsed.data.workspaceId);

  if (error) {
    return { status: 'error', message: error.message };
  }

  revalidatePath('/settings/workspace');
  revalidatePath('/', 'layout');
  return { status: 'saved' };
}
