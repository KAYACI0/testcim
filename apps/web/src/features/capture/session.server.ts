'use server';

import crypto from 'node:crypto';

import QRCode from 'qrcode';

import {
  createCaptureSessionSchema,
  mobileCaptureSubmitSchema,
  type CreateCaptureSessionInput,
  type MobileCaptureSubmitInput,
  type RealtimeCaptureQuestionEvent,
} from '@testcim/shared';

import { requireSession } from '@/lib/auth/dal';
import { clientEnv } from '@/lib/env.client';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export interface CreateCaptureSessionResult {
  readonly ok: boolean;
  readonly token?: string;
  readonly sessionId?: string;
  readonly expiresAt?: string;
  readonly mobileUrl?: string;
  readonly qrCodeDataUrl?: string;
  readonly testTitle?: string;
  readonly reason?: string;
}

export interface MobileSessionValidationResult {
  readonly ok: boolean;
  readonly session?: {
    readonly sessionId: string;
    readonly workspaceId: string;
    readonly testId: string;
    readonly testTitle: string;
    readonly deviceType: string;
  };
  readonly reason?: string;
}

export interface MobileSignedUploadResult {
  readonly ok: boolean;
  readonly signedUrl?: string;
  readonly path?: string;
  readonly token?: string;
  readonly reason?: string;
}

export interface SubmitCaptureResult {
  readonly ok: boolean;
  readonly questionId?: string;
  readonly questionRevisionId?: string;
  readonly itemId?: string;
  readonly reason?: string;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Creates a short-lived capture session for an external device (phone, extension, desktop).
 * Generates an unguessable pairing token, stores its SHA-256 hash in the database,
 * and creates a QR code data URL for mobile pairing.
 */
export async function createCaptureSessionAction(
  rawInput: CreateCaptureSessionInput,
): Promise<CreateCaptureSessionResult> {
  const session = await requireSession();
  const parsed = createCaptureSessionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, reason: 'invalid_input' };
  }

  const input = parsed.data;
  const supabase = await createClient();

  const { data: test, error: testError } = await supabase
    .from('tests')
    .select('id, workspace_id, title')
    .eq('id', input.testId)
    .single();

  if (testError || !test) {
    return { ok: false, reason: 'test_not_found' };
  }

  const token = crypto.randomBytes(24).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { data: inserted, error: insertError } = await supabase
    .from('capture_sessions')
    .insert({
      workspace_id: test.workspace_id,
      test_id: input.testId,
      created_by: session.userId,
      token_hash: tokenHash,
      device_type: input.deviceType,
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    return { ok: false, reason: insertError?.message ?? 'create_session_failed' };
  }

  const mobileUrl = `${clientEnv.NEXT_PUBLIC_SITE_URL}/capture/mobile/${token}`;
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(mobileUrl, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 256,
    });
  } catch (qrError) {
    return {
      ok: false,
      reason: qrError instanceof Error ? qrError.message : 'qr_generation_failed',
    };
  }

  return {
    ok: true,
    token,
    sessionId: inserted.id,
    expiresAt,
    mobileUrl,
    qrCodeDataUrl,
    testTitle: test.title,
  };
}

/**
 * Validates a capture token on an external device (e.g. mobile camera page).
 * Anonymous / unauthenticated endpoint that authenticates solely via the pairing token.
 */
export async function getMobileCaptureSessionAction(
  token: string,
): Promise<MobileSessionValidationResult> {
  if (!token || token.length < 16) {
    return { ok: false, reason: 'invalid_token' };
  }

  const tokenHash = hashToken(token);
  const admin = createAdminClient();

  const { data, error } = await admin.rpc('validate_capture_session', {
    p_token_hash: tokenHash,
  });

  if (error || !data || data.length === 0 || !data[0]?.is_valid) {
    return { ok: false, reason: 'invalid_or_expired' };
  }

  const row = data[0];
  return {
    ok: true,
    session: {
      sessionId: row.session_id ?? '',
      workspaceId: row.workspace_id ?? '',
      testId: row.test_id ?? '',
      testTitle: row.test_title ?? '',
      deviceType: row.device_type ?? 'phone',
    },
  };
}

/**
 * Generates a signed storage upload URL for an active mobile capture session,
 * allowing the phone to upload directly to Storage without passing through the Next.js server.
 */
export async function getMobileSignedUploadUrlAction(
  token: string,
  ext: string = 'jpg',
): Promise<MobileSignedUploadResult> {
  const sessionRes = await getMobileCaptureSessionAction(token);
  if (!sessionRes.ok || !sessionRes.session) {
    return { ok: false, reason: sessionRes.reason ?? 'invalid_or_expired' };
  }

  const { workspaceId } = sessionRes.session;
  const year = new Date().getFullYear();
  const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
  const path = `${workspaceId}/${year}/${crypto.randomUUID()}.${safeExt}`;

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from('assets').createSignedUploadUrl(path);

  if (error || !data) {
    return { ok: false, reason: error?.message ?? 'upload_url_failed' };
  }

  return {
    ok: true,
    signedUrl: data.signedUrl,
    path,
    token: data.token,
  };
}

/**
 * Submits a captured image from an external device session (phone, extension, desktop).
 * Invokes the atomic `submit_capture_question` RPC and broadcasts the new question
 * via Supabase Realtime channel `capture:${testId}` to instantaneously appear in the desktop strip.
 */
export async function submitCaptureQuestionAction(
  rawInput: MobileCaptureSubmitInput,
): Promise<SubmitCaptureResult> {
  const parsed = mobileCaptureSubmitSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, reason: 'invalid_input' };
  }

  const input = parsed.data;
  const tokenHash = hashToken(input.token);
  const admin = createAdminClient();

  const { data, error } = await admin.rpc('submit_capture_question', {
    p_token_hash: tokenHash,
    p_item_id: input.itemId,
    p_position: input.position,
    p_asset_path: input.path,
    p_mime: input.mime,
    p_bytes: input.bytes,
    p_width: input.width,
    p_height: input.height,
    p_sha256: input.sha256,
    p_phash: input.phash,
    p_answer: input.answer ?? null,
  });

  if (error || !data || data.length === 0) {
    return { ok: false, reason: error?.message ?? 'submit_failed' };
  }

  const row = data[0];
  if (!row?.ok) {
    return { ok: false, reason: row?.error ?? 'submit_failed' };
  }

  // Broadcast to Realtime channel for live desktop editor strip update
  try {
    let thumbnailUrl: string | undefined;
    try {
      const { data: signed } = await admin.storage.from('assets').createSignedUrl(input.path, 3600);
      thumbnailUrl = signed?.signedUrl;
    } catch {
      // Ignore signed URL failure
    }

    const channel = admin.channel(`capture:${row.test_id}`);
    channel.subscribe();

    const eventPayload: RealtimeCaptureQuestionEvent = {
      type: 'question_captured',
      testId: row.test_id ?? '',
      itemId: row.item_id ?? input.itemId,
      questionId: row.question_id ?? '',
      questionRevisionId: row.question_revision_id ?? '',
      assetId: row.asset_id ?? '',
      path: input.path,
      width: input.width,
      height: input.height,
      deviceType: 'phone',
      ...(thumbnailUrl ? { thumbnailUrl } : {}),
      ...(input.answer ? { answer: input.answer } : {}),
    };

    await channel.send({
      type: 'broadcast',
      event: 'question_captured',
      payload: eventPayload,
    });
    await admin.removeChannel(channel);
  } catch (broadcastError) {
    // Non-fatal if broadcast fails; database transaction succeeded.
    console.error('Failed to broadcast capture event:', broadcastError);
  }

  return {
    ok: true,
    questionId: row.question_id ?? '',
    questionRevisionId: row.question_revision_id ?? '',
    itemId: row.item_id ?? input.itemId,
  };
}

/**
 * Closes an active capture session.
 */
export async function closeCaptureSessionAction(sessionId: string): Promise<{ ok: boolean }> {
  const session = await requireSession();
  if (!session) {
    return { ok: false };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('close_capture_session', {
    p_session_id: sessionId,
  });

  if (error) {
    return { ok: false };
  }

  return { ok: Boolean(data) };
}
