import { NextResponse } from 'next/server';
import { z } from 'zod';

import { computeDeadline, entitlementsSchema, isWithinExamWindow } from '@testcim/shared';

import type { NextRequest } from 'next/server';

import {
  checkRateLimit,
  clientIp,
  examCookieName,
  generateToken,
  hashIdentifier,
  hashToken,
  resolveAttemptFromCookie,
} from '@/features/online-exam/anon.server';
import { createAdminClient } from '@/lib/supabase/admin';

const joinSchema = z.object({
  slug: z.string().min(1),
  displayName: z.string().min(1).max(120).optional(),
  studentNo: z.string().max(40).optional(),
  classLabel: z.string().max(80).optional(),
  joinCode: z.string().max(20).optional(),
});

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!(await checkRateLimit(`join:${ip}`, 20, 60))) {
    return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: 'invalid_input' }, { status: 400 });
  }
  const input = parsed.data;

  const existing = await resolveAttemptFromCookie(request, input.slug);
  if (existing && existing.status === 'in_progress') {
    return resumeResponse(existing.id);
  }

  const admin = createAdminClient();
  const { data: exam } = await admin
    .from('online_exams')
    .select(
      'id, workspace_id, title, status, access, join_code, opens_at, closes_at, duration_sec, max_attempts, shuffle_questions, shuffle_options, required_fields, participant_cap',
    )
    .eq('slug', input.slug)
    .single();
  if (!exam) {
    return NextResponse.json({ ok: false, reason: 'exam_not_found' }, { status: 404 });
  }

  if (exam.status === 'draft' || exam.status === 'closed') {
    return NextResponse.json({ ok: false, reason: 'exam_not_open' }, { status: 403 });
  }
  const now = new Date();
  if (
    !isWithinExamWindow({
      now,
      opensAt: exam.opens_at ? new Date(exam.opens_at) : null,
      closesAt: exam.closes_at ? new Date(exam.closes_at) : null,
    })
  ) {
    return NextResponse.json({ ok: false, reason: 'exam_not_open' }, { status: 403 });
  }

  if (exam.access === 'code' && input.joinCode !== exam.join_code) {
    return NextResponse.json({ ok: false, reason: 'invalid_join_code' }, { status: 403 });
  }

  const { data: entitlementsRaw } = await admin.rpc('get_entitlements', {
    p_ws: exam.workspace_id,
  });
  const entitlements = entitlementsSchema.safeParse(entitlementsRaw);
  const cap = [
    exam.participant_cap,
    entitlements.success && entitlements.data.online_participants_per_exam >= 0
      ? entitlements.data.online_participants_per_exam
      : null,
  ].filter((v): v is number => v !== null && v >= 0);

  if (cap.length > 0) {
    const { count } = await admin
      .from('exam_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('online_exam_id', exam.id);
    if ((count ?? 0) >= Math.min(...cap)) {
      return NextResponse.json({ ok: false, reason: 'exam_full' }, { status: 403 });
    }
  }

  const identifierHash =
    input.studentNo || input.displayName
      ? hashIdentifier(input.studentNo ?? input.displayName ?? '')
      : null;

  if (exam.max_attempts && identifierHash) {
    const { count } = await admin
      .from('exam_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('online_exam_id', exam.id)
      .eq('flags->>identifierHash', identifierHash);
    if ((count ?? 0) >= exam.max_attempts) {
      return NextResponse.json({ ok: false, reason: 'max_attempts_reached' }, { status: 403 });
    }
  }

  const token = generateToken();
  const deadlineAt = computeDeadline({
    now,
    durationSec: exam.duration_sec,
    closesAt: exam.closes_at ? new Date(exam.closes_at) : null,
  });

  const { data: attempt, error } = await admin
    .from('exam_attempts')
    .insert({
      workspace_id: exam.workspace_id,
      online_exam_id: exam.id,
      display_name: input.displayName ?? null,
      student_no: input.studentNo ?? null,
      class_label: input.classLabel ?? null,
      token_hash: hashToken(token),
      started_at: now.toISOString(),
      deadline_at: deadlineAt?.toISOString() ?? null,
      status: 'in_progress',
      ip_hash: hashIdentifier(ip),
      ua_hash: hashIdentifier(request.headers.get('user-agent') ?? 'unknown'),
      flags: identifierHash ? { identifierHash } : {},
    })
    .select('id')
    .single();
  if (error || !attempt) {
    return NextResponse.json(
      { ok: false, reason: error?.message ?? 'join_failed' },
      { status: 500 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    attemptId: attempt.id,
    examTitle: exam.title,
    durationSec: exam.duration_sec,
    deadlineAt: deadlineAt?.toISOString() ?? null,
    shuffleQuestions: exam.shuffle_questions,
    shuffleOptions: exam.shuffle_options,
    requiredFields: exam.required_fields,
  });
  response.cookies.set(examCookieName(input.slug), token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return response;
}

function resumeResponse(attemptId: string) {
  return NextResponse.json({ ok: true, attemptId, resumed: true });
}
