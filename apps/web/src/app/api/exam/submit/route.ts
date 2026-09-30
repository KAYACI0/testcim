import { NextResponse } from 'next/server';
import { z } from 'zod';

import type { NextRequest } from 'next/server';

import {
  checkRateLimit,
  clientIp,
  resolveAttemptFromCookie,
} from '@/features/online-exam/anon.server';
import { ensureAttemptScored } from '@/features/online-exam/scoring.server';
import { createAdminClient } from '@/lib/supabase/admin';

const submitSchema = z.object({ slug: z.string().min(1) });

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(`submit:${clientIp(request)}`, 10, 60))) {
    return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: 'invalid_input' }, { status: 400 });
  }

  const attempt = await resolveAttemptFromCookie(request, parsed.data.slug);
  if (!attempt) {
    return NextResponse.json({ ok: false, reason: 'not_joined' }, { status: 401 });
  }

  const admin = createAdminClient();

  if (attempt.status === 'in_progress') {
    await admin
      .from('exam_attempts')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', attempt.id);
  }

  const { score, maxScore, hasUngraded } = await ensureAttemptScored(admin, attempt.id);

  const { data: exam } = await admin
    .from('online_exams')
    .select('show_results, status')
    .eq('id', attempt.onlineExamId)
    .single();

  const canShowResults =
    exam?.show_results === 'after_submit' ||
    (exam?.show_results === 'after_close' && exam.status === 'closed');

  return NextResponse.json({
    ok: true,
    score: canShowResults ? score : null,
    maxScore: canShowResults ? maxScore : null,
    hasUngraded,
    resultsVisible: canShowResults,
  });
}
