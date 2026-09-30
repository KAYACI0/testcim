'use server';

import {
  renderTestDocx,
  renderTestPptx,
  type ExportTestData,
  type PptxExportData,
} from '@testcim/renderers';

import { requireSession } from '@/lib/auth/dal';
import { getCurrentWorkspace } from '@/lib/workspace/current';
import { EntitlementError, requireFlag } from '@/lib/workspace/entitlements.server';

/**
 * Gates DOCX/PPTX export on the `docx_pptx_export` entitlement — the first
 * real call site for `requireFlag` in this codebase.
 *
 * Callers must already have mapped a test's questions into the renderer's
 * narrow `ExportTestData`/`PptxExportData` shape (rich/formula/image stems
 * rendered to PNG). That mapping — reading `test_items`/`questions` and
 * rasterizing rich content — needs an HTML-to-image pipeline this repo
 * doesn't have yet (the existing `rich-editor` render path only goes to
 * HTML, for in-browser print preview); it's tracked in docs/backlog.md
 * rather than guessed at here.
 */
export async function exportTestDocx(
  data: ExportTestData,
): Promise<
  { readonly ok: true; readonly base64: string } | { readonly ok: false; readonly reason: string }
> {
  await requireSession();
  const workspace = await getCurrentWorkspace();

  try {
    await requireFlag(workspace.id, 'docx_pptx_export');
  } catch (error) {
    if (error instanceof EntitlementError) return { ok: false, reason: 'entitlement_denied' };
    throw error;
  }

  const bytes = await renderTestDocx(data);
  return { ok: true, base64: Buffer.from(bytes).toString('base64') };
}

export async function exportTestPptx(
  data: PptxExportData,
): Promise<
  { readonly ok: true; readonly base64: string } | { readonly ok: false; readonly reason: string }
> {
  await requireSession();
  const workspace = await getCurrentWorkspace();

  try {
    await requireFlag(workspace.id, 'docx_pptx_export');
  } catch (error) {
    if (error instanceof EntitlementError) return { ok: false, reason: 'entitlement_denied' };
    throw error;
  }

  const bytes = await renderTestPptx(data);
  return { ok: true, base64: Buffer.from(bytes).toString('base64') };
}
