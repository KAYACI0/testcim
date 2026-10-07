'use server';

import { requireSession } from '@/lib/auth/dal';
import { getCurrentWorkspace } from '@/lib/workspace/current';
import { EntitlementError, requireFlag } from '@/lib/workspace/entitlements.server';

export type AuthorizeExportResult =
  { readonly ok: true } | { readonly ok: false; readonly reason: 'entitlement_denied' };

/**
 * Gates Word and PowerPoint export on the `docx_pptx_export` entitlement. The file itself
 * is built in the browser, next to the images: sending hundreds of kilobytes of pictures
 * through a server request body would hit the platform body limit (CLAUDE.md: files do not
 * go through the server). So the server's job here is the decision, not the bytes.
 */
export async function authorizeExport(): Promise<AuthorizeExportResult> {
  await requireSession();
  const workspace = await getCurrentWorkspace();

  try {
    await requireFlag(workspace.id, 'docx_pptx_export');
  } catch (error) {
    if (error instanceof EntitlementError) return { ok: false, reason: 'entitlement_denied' };
    throw error;
  }

  return { ok: true };
}
