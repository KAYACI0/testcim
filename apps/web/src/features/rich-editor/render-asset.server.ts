import 'server-only';

import { z } from 'zod';

import { limit as entitlementLimit, UNLIMITED } from '@testcim/shared';

import { type createClient } from '@/lib/supabase/server';
import { getEntitlements } from '@/lib/workspace/entitlements.server';

const BYTES_PER_MB = 1024 * 1024;

export const renderAssetSchema = z.object({
  path: z.string().min(1),
  mime: z.string().min(1),
  bytes: z.number().int().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sha256: z.string().length(64),
});

export async function chargeRenderAsset(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  ownerId: string,
  render: z.infer<typeof renderAssetSchema>,
): Promise<{ ok: true; assetId: string } | { ok: false; reason: string }> {
  const entitlements = await getEntitlements(workspaceId);
  const storageLimitMb = entitlementLimit(entitlements, 'storage_mb');

  if (storageLimitMb !== UNLIMITED) {
    const { data: usage } = await supabase
      .from('assets')
      .select('bytes')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null);
    const usedBytes = (usage ?? []).reduce((sum, row) => sum + row.bytes, 0);

    if ((usedBytes + render.bytes) / BYTES_PER_MB > storageLimitMb) {
      await supabase.storage.from('assets').remove([render.path]);
      return { ok: false, reason: 'storage_limit_exceeded' };
    }
  }

  const { data: inserted, error } = await supabase
    .from('assets')
    .insert({
      workspace_id: workspaceId,
      owner_id: ownerId,
      bucket: 'assets',
      path: render.path,
      kind: 'render',
      mime: render.mime,
      bytes: render.bytes,
      width: render.width,
      height: render.height,
      sha256: render.sha256,
      source: 'rich_render',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('assets')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('sha256', render.sha256)
        .eq('kind', 'render')
        .single();
      await supabase.storage.from('assets').remove([render.path]);
      if (!existing) {
        return { ok: false, reason: 'asset_conflict' };
      }
      return { ok: true, assetId: existing.id };
    }
    return { ok: false, reason: error.message };
  }

  return { ok: true, assetId: inserted.id };
}
