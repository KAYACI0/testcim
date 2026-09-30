import 'server-only';

import {
  attemptIsWritable,
  examCookieName,
  generateToken,
  hashIdentifier,
  hashToken,
  type ActiveAttempt,
} from './anon-pure';

import type { NextRequest } from 'next/server';

import { createAdminClient } from '@/lib/supabase/admin';

export {
  attemptIsWritable,
  examCookieName,
  generateToken,
  hashIdentifier,
  hashToken,
  type ActiveAttempt,
};

/** Best-effort client IP for rate-limiting and `exam_attempts.ip_hash` — never stored raw. */
export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Fixed-window rate limit backed by `check_exam_rate_limit()` (docs/adr/0004
 * §5 — no Upstash credentials in this environment). Fails *closed*: if the
 * RPC itself errors, the caller is rejected rather than let through.
 */
export async function checkRateLimit(
  bucketKey: string,
  limit: number,
  windowSec: number,
): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('check_exam_rate_limit', {
    p_key: bucketKey,
    p_limit: limit,
    p_window_sec: windowSec,
  });
  if (error) return false;
  return data === true;
}

/**
 * Resolves the caller's attempt from their HttpOnly cookie. Returns `null`
 * for anything that isn't a live, matching, non-expired attempt — callers
 * treat that uniformly as "not joined" rather than leaking which reason.
 */
export async function resolveAttemptFromCookie(
  request: NextRequest,
  slug: string,
): Promise<ActiveAttempt | null> {
  const token = request.cookies.get(examCookieName(slug))?.value;
  if (!token) return null;

  const admin = createAdminClient();
  const { data: exam } = await admin
    .from('online_exams')
    .select('id, workspace_id')
    .eq('slug', slug)
    .single();
  if (!exam) return null;

  const { data: attempt } = await admin
    .from('exam_attempts')
    .select('id, workspace_id, online_exam_id, deadline_at, status')
    .eq('token_hash', hashToken(token))
    .eq('online_exam_id', exam.id)
    .maybeSingle();
  if (!attempt) return null;

  return {
    id: attempt.id,
    workspaceId: attempt.workspace_id,
    onlineExamId: attempt.online_exam_id,
    deadlineAt: attempt.deadline_at,
    status: attempt.status,
  };
}

export interface PublicExamInfo {
  readonly title: string;
  readonly mode: 'async' | 'live';
  readonly access: 'link' | 'code' | 'roster';
  readonly status: 'draft' | 'scheduled' | 'open' | 'closed';
  readonly requiredFields: Record<string, unknown>;
}

/**
 * Minimal, non-sensitive exam metadata for the public join page — no
 * questions, no participant data. Read through the admin client because
 * `online_exams` has no anon select policy (teacher-only via RLS).
 */
export async function getPublicExamInfo(slug: string): Promise<PublicExamInfo | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('online_exams')
    .select('title, mode, access, status, required_fields')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return null;
  return {
    title: data.title,
    mode: data.mode,
    access: data.access,
    status: data.status,
    requiredFields: data.required_fields,
  };
}
