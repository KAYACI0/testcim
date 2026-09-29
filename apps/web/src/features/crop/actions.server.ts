'use server';

import { uuidv7 } from 'uuidv7';
import { z } from 'zod';

import { limit as entitlementLimit, UNLIMITED } from '@testcim/shared';

import {
  ACCEPTED_SOURCE_DOCUMENT_MIME,
  MAX_SOURCE_DOCUMENT_BYTES,
  MAX_SOURCE_DOCUMENT_PAGES,
  TUS_UPLOAD_THRESHOLD_BYTES,
} from './limits';
import { readPdfPageCount } from './pdf-validate';

import { requireSession } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';
import { getEntitlements } from '@/lib/workspace/entitlements.server';

const BYTES_PER_MB = 1024 * 1024;

const beginInputSchema = z.object({
  testId: z.uuid(),
  fileName: z.string().min(1),
  mime: z.enum(ACCEPTED_SOURCE_DOCUMENT_MIME),
  bytes: z.number().int().positive(),
});

export type BeginSourceDocumentUploadResult =
  | {
      readonly ok: true;
      readonly workspaceId: string;
      readonly path: string;
      readonly useTus: boolean;
    }
  | { readonly ok: false; readonly reason: string };

/**
 * Pre-flight for a source document upload: resolves the workspace, checks
 * the size/storage-quota ceilings, and hands back the Storage path the
 * client should upload the actual bytes to. The bytes themselves never pass
 * through this server (docs/02 §2) — this only decides whether the upload
 * should use a direct `storage.upload` call or TUS resumable upload
 * (docs/adr/0003 §1: the 20 MB threshold).
 */
export async function beginSourceDocumentUpload(
  rawInput: z.infer<typeof beginInputSchema>,
): Promise<BeginSourceDocumentUploadResult> {
  await requireSession();
  const parsed = beginInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { ok: false, reason: 'invalid_input' };
  }
  const input = parsed.data;

  if (input.bytes > MAX_SOURCE_DOCUMENT_BYTES) {
    return { ok: false, reason: 'file_too_large' };
  }

  const supabase = await createClient();

  const { data: test, error: testError } = await supabase
    .from('tests')
    .select('workspace_id')
    .eq('id', input.testId)
    .single();

  if (testError || !test) {
    return { ok: false, reason: 'test_not_found' };
  }
  const workspaceId = test.workspace_id;

  const entitlements = await getEntitlements(workspaceId);
  const storageLimitMb = entitlementLimit(entitlements, 'storage_mb');

  if (storageLimitMb !== UNLIMITED) {
    const { data: usage } = await supabase
      .from('assets')
      .select('bytes')
      .eq('workspace_id', workspaceId)
      .is('deleted_at', null);
    const usedBytes = (usage ?? []).reduce((sum, row) => sum + row.bytes, 0);

    if ((usedBytes + input.bytes) / BYTES_PER_MB > storageLimitMb) {
      return { ok: false, reason: 'storage_limit_exceeded' };
    }
  }

  const extension = extensionFor(input.mime);
  const year = new Date().getFullYear();
  const path = `${workspaceId}/${year}/${uuidv7()}.${extension}`;

  return { ok: true, workspaceId, path, useTus: input.bytes >= TUS_UPLOAD_THRESHOLD_BYTES };
}

const finalizeInputSchema = z.object({
  testId: z.uuid(),
  path: z.string().min(1),
  name: z.string().min(1),
  mime: z.enum(ACCEPTED_SOURCE_DOCUMENT_MIME),
  bytes: z.number().int().positive(),
});

export type FinalizeSourceDocumentResult =
  | { readonly ok: true; readonly sourceDocumentId: string; readonly pageCount: number | null }
  | { readonly ok: false; readonly reason: string };

/**
 * Runs after the client finished uploading the file straight to Storage
 * (direct upload or TUS): re-validates the page count server-side for PDFs
 * (docs/02 §5.1) and, only if it passes, creates the `assets` +
 * `source_documents` rows. Anything that fails validation gets its Storage
 * object removed immediately — no orphaned, unusable file left behind.
 */
export async function finalizeSourceDocument(
  rawInput: z.infer<typeof finalizeInputSchema>,
): Promise<FinalizeSourceDocumentResult> {
  const session = await requireSession();
  const parsed = finalizeInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return { ok: false, reason: 'invalid_input' };
  }
  const input = parsed.data;

  const supabase = await createClient();

  const { data: test, error: testError } = await supabase
    .from('tests')
    .select('workspace_id')
    .eq('id', input.testId)
    .single();

  if (testError || !test) {
    return { ok: false, reason: 'test_not_found' };
  }
  const workspaceId = test.workspace_id;

  if (!input.path.startsWith(`${workspaceId}/`)) {
    return { ok: false, reason: 'path_mismatch' };
  }

  let pageCount: number | null = null;

  if (input.mime === 'application/pdf') {
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('assets')
      .download(input.path);

    if (downloadError || !fileBlob) {
      return { ok: false, reason: 'download_failed' };
    }

    const bytes = new Uint8Array(await fileBlob.arrayBuffer());
    pageCount = await readPdfPageCount(bytes);

    if (pageCount > MAX_SOURCE_DOCUMENT_PAGES) {
      await supabase.storage.from('assets').remove([input.path]);
      return { ok: false, reason: 'too_many_pages' };
    }
  }

  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .insert({
      workspace_id: workspaceId,
      owner_id: session.userId,
      bucket: 'assets',
      path: input.path,
      kind: input.mime === 'application/pdf' ? 'pdf' : 'image',
      mime: input.mime,
      bytes: input.bytes,
      source: 'upload',
    })
    .select('id')
    .single();

  if (assetError || !asset) {
    await supabase.storage.from('assets').remove([input.path]);
    return { ok: false, reason: assetError?.message ?? 'asset_create_failed' };
  }

  const { data: sourceDocument, error: sourceDocumentError } = await supabase
    .from('source_documents')
    .insert({
      workspace_id: workspaceId,
      asset_id: asset.id,
      name: input.name,
      page_count: pageCount,
    })
    .select('id')
    .single();

  if (sourceDocumentError || !sourceDocument) {
    return { ok: false, reason: sourceDocumentError?.message ?? 'source_document_create_failed' };
  }

  return { ok: true, sourceDocumentId: sourceDocument.id, pageCount };
}

function extensionFor(mime: (typeof ACCEPTED_SOURCE_DOCUMENT_MIME)[number]): string {
  switch (mime) {
    case 'application/pdf':
      return 'pdf';
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/gif':
      return 'gif';
    case 'image/webp':
      return 'webp';
    default:
      return 'bin';
  }
}
