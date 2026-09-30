import { NextResponse } from 'next/server';

import type { NextRequest } from 'next/server';

import {
  checkRateLimit,
  clientIp,
  resolveAttemptFromCookie,
} from '@/features/online-exam/anon.server';
import { loadStudentQuestions } from '@/features/online-exam/exam-content.server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ ok: false, reason: 'invalid_input' }, { status: 400 });
  }
  if (!(await checkRateLimit(`questions:${clientIp(request)}`, 60, 60))) {
    return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429 });
  }

  const attempt = await resolveAttemptFromCookie(request, slug);
  if (!attempt) {
    return NextResponse.json({ ok: false, reason: 'not_joined' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: exam } = await admin
    .from('online_exams')
    .select('shuffle_questions, shuffle_options, show_results')
    .eq('id', attempt.onlineExamId)
    .single();
  if (!exam) {
    return NextResponse.json({ ok: false, reason: 'exam_not_found' }, { status: 404 });
  }

  const questions = await loadStudentQuestions(
    attempt.onlineExamId,
    attempt.id,
    exam.shuffle_questions,
    exam.shuffle_options,
  );

  return NextResponse.json({
    ok: true,
    status: attempt.status,
    deadlineAt: attempt.deadlineAt,
    questions,
  });
}
