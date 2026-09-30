import { NextResponse } from 'next/server';
import { z } from 'zod';

import type { NextRequest } from 'next/server';

import {
  checkRateLimit,
  clientIp,
  resolveAttemptFromCookie,
  attemptIsWritable,
} from '@/features/online-exam/anon.server';
import { createAdminClient } from '@/lib/supabase/admin';

const answerSchema = z.object({
  slug: z.string().min(1),
  itemId: z.uuid(),
  answer: z.unknown(),
  tabSwitchCount: z.number().int().nonnegative().optional(),
  timeSpentMs: z.number().int().nonnegative().optional(),
});

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit(`answer:${clientIp(request)}`, 120, 60))) {
    return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = answerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: 'invalid_input' }, { status: 400 });
  }
  const input = parsed.data;

  const attempt = await resolveAttemptFromCookie(request, input.slug);
  if (!attempt) {
    return NextResponse.json({ ok: false, reason: 'not_joined' }, { status: 401 });
  }
  if (!attemptIsWritable(attempt)) {
    return NextResponse.json({ ok: false, reason: 'attempt_closed' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: item } = await admin
    .from('online_exam_items')
    .select('id')
    .eq('id', input.itemId)
    .eq('online_exam_id', attempt.onlineExamId)
    .maybeSingle();
  if (!item) {
    return NextResponse.json({ ok: false, reason: 'item_not_found' }, { status: 404 });
  }

  const { error } = await admin.from('attempt_answers').upsert(
    {
      workspace_id: attempt.workspaceId,
      attempt_id: attempt.id,
      item_id: input.itemId,
      answer: input.answer ?? null,
      answered_at: new Date().toISOString(),
      time_spent_ms: input.timeSpentMs ?? null,
    },
    { onConflict: 'attempt_id,item_id' },
  );
  if (error) {
    return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });
  }

  if (input.tabSwitchCount) {
    const { data: current } = await admin
      .from('exam_attempts')
      .select('flags')
      .eq('id', attempt.id)
      .single();
    const flags = (current?.flags as Record<string, unknown>) ?? {};
    const previous = typeof flags.tabSwitchCount === 'number' ? flags.tabSwitchCount : 0;
    await admin
      .from('exam_attempts')
      .update({ flags: { ...flags, tabSwitchCount: Math.max(previous, input.tabSwitchCount) } })
      .eq('id', attempt.id);
  }

  return NextResponse.json({ ok: true });
}
