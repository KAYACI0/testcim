'use server';

import { z } from 'zod';

import { renderReportCardPdf, type ReportCardData } from '@testcim/renderers';

import { buildReportCardScoreRows } from './build-scores';

import { loadPromptTemplate } from '@/features/ai/prompts/loader';
import { executeAiJob } from '@/features/ai/run-ai-job.server';
import { requireSession } from '@/lib/auth/dal';
import { loadPdfFontBytes } from '@/lib/pdf-fonts.server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/current';
import { requireRole } from '@/lib/workspace/entitlements.server';

const reportCardLabels = {
  title: 'Karne',
  studentNoLabel: 'Numara',
  classLabel: 'Sınıf',
  scoresTitle: 'Sonuçlar',
  outcomesTitle: 'Kazanımlar',
  summaryTitle: 'Öğretmen değerlendirmesi',
  scoreColumn: 'Puan',
  dateColumn: 'Tarih',
};

async function getStudentAndClass(studentId: string, classId: string, workspaceId: string) {
  const supabase = await createClient();
  const [{ data: student }, { data: klass }] = await Promise.all([
    supabase
      .from('students')
      .select('id, full_name, student_no')
      .eq('id', studentId)
      .eq('workspace_id', workspaceId)
      .single(),
    supabase
      .from('classes')
      .select('id, name')
      .eq('id', classId)
      .eq('workspace_id', workspaceId)
      .single(),
  ]);
  return { student, klass, supabase };
}

async function getStudentScoreRows(studentId: string, workspaceId: string) {
  const supabase = await createClient();

  const { data: attempts } = await supabase
    .from('exam_attempts')
    .select('score, max_score, submitted_at, online_exam_id')
    .eq('workspace_id', workspaceId)
    .eq('student_id', studentId)
    .not('score', 'is', null);

  const examIds = [...new Set((attempts ?? []).map((a) => a.online_exam_id))];
  const { data: exams } =
    examIds.length === 0
      ? { data: [] as Array<{ id: string; title: string }> }
      : await supabase.from('online_exams').select('id, title').in('id', examIds);
  const examTitleById = new Map((exams ?? []).map((e) => [e.id, e.title]));

  const { data: scans } = await supabase
    .from('omr_scans')
    .select('score, created_at, session_id')
    .eq('workspace_id', workspaceId)
    .eq('student_id', studentId)
    .not('score', 'is', null);

  const sessionIds = [...new Set((scans ?? []).map((s) => s.session_id))];
  const { data: sessions } =
    sessionIds.length === 0
      ? { data: [] as Array<{ id: string; test_id: string }> }
      : await supabase.from('omr_sessions').select('id, test_id').in('id', sessionIds);
  const testIdBySession = new Map((sessions ?? []).map((s) => [s.id, s.test_id]));

  const testIds = [...new Set((sessions ?? []).map((s) => s.test_id))];
  const { data: tests } =
    testIds.length === 0
      ? { data: [] as Array<{ id: string; title: string }> }
      : await supabase.from('tests').select('id, title').in('id', testIds);
  const testTitleById = new Map((tests ?? []).map((t) => [t.id, t.title]));

  return buildReportCardScoreRows(
    (attempts ?? [])
      .filter(
        (a): a is typeof a & { score: number; max_score: number } =>
          a.score != null && a.max_score != null,
      )
      .map((a) => ({
        examTitle: examTitleById.get(a.online_exam_id) ?? '',
        score: a.score,
        maxScore: a.max_score,
        submittedAt: a.submitted_at,
      })),
    (scans ?? [])
      .filter((s): s is typeof s & { score: number } => s.score != null)
      .map((s) => {
        const testId = testIdBySession.get(s.session_id);
        return {
          testTitle: testId ? (testTitleById.get(testId) ?? '') : '',
          score: s.score,
          createdAt: s.created_at,
        };
      }),
  );
}

async function getApprovedSummaryText(
  studentId: string,
  classId: string,
  workspaceId: string,
): Promise<string | undefined> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('report_card_summaries')
    .select('summary_text')
    .eq('workspace_id', workspaceId)
    .eq('student_id', studentId)
    .eq('class_id', classId)
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.summary_text ?? undefined;
}

/** Renders one student's karne PDF (scores + an approved AI summary, if any). Draft summaries never reach the PDF. */
export async function generateReportCardPdf(studentId: string, classId: string) {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);

  const { student, klass } = await getStudentAndClass(studentId, classId, workspace.id);
  if (!student || !klass) return { ok: false as const, reason: 'not_found' };

  const [scores, summaryText] = await Promise.all([
    getStudentScoreRows(studentId, workspace.id),
    getApprovedSummaryText(studentId, classId, workspace.id),
  ]);

  const data: ReportCardData = {
    studentName: student.full_name,
    studentNo: student.student_no,
    className: klass.name,
    labels: reportCardLabels,
    scores,
    outcomes: [],
    ...(summaryText ? { summaryText } : {}),
  };

  const bytes = await renderReportCardPdf(data, await loadPdfFontBytes());
  return { ok: true as const, base64: Buffer.from(bytes).toString('base64') };
}

const summaryOutputSchema = z.object({ summary: z.string().trim().min(1).max(800) });

/** Drafts an AI summary from this student's scores; never auto-approved (CLAUDE.md: AI output is always a draft). */
export async function requestReportCardSummary(studentId: string, classId: string) {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);

  const scores = await getStudentScoreRows(studentId, workspace.id);
  const sourceReport = { scores };

  const result = await executeAiJob({
    workspaceId: workspace.id,
    kind: 'report_card_summary',
    system: loadPromptTemplate('report_card_summary.v1.md'),
    prompt: JSON.stringify(sourceReport),
    outputSchema: summaryOutputSchema,
  });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('report_card_summaries')
    .insert({
      workspace_id: workspace.id,
      student_id: studentId,
      class_id: classId,
      source_report: sourceReport,
      summary_text: result.data.summary,
    })
    .select('id, summary_text, status')
    .single();
  if (error || !data) return { ok: false as const, reason: error?.message ?? 'insert_failed' };

  return { ok: true as const, summary: data };
}

/** Approves a draft AI summary (owner/admin only) so it can appear on the karne PDF. */
export async function approveReportCardSummary(summaryId: string) {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin']);

  const supabase = await createClient();
  const { error } = await supabase.rpc('approve_report_card_summary', {
    p_workspace_id: workspace.id,
    p_id: summaryId,
  });
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

export interface ReportCardSummaryRow {
  readonly id: string;
  readonly summary_text: string;
  readonly status: 'draft' | 'approved';
  readonly created_at: string;
}

/** Latest draft or approved summary for one student in one class, if any. */
export async function getLatestReportCardSummary(
  studentId: string,
  classId: string,
): Promise<ReportCardSummaryRow | null> {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  const { data } = await supabase
    .from('report_card_summaries')
    .select('id, summary_text, status, created_at')
    .eq('workspace_id', workspace.id)
    .eq('student_id', studentId)
    .eq('class_id', classId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
