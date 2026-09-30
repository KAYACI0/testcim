'use server';

import {
  classReportSchema,
  outcomeReportSchema,
  studentProgressSchema,
  weakTopicsSchema,
  type ClassReport,
  type OutcomeReportRow,
  type StudentProgressRow,
  type WeakTopicRow,
} from '@testcim/shared';

import { requireSession } from '@/lib/auth/dal';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/current';

/** Class-wide average/distribution/hardest-questions report (online-exam attempts only, see migration scope note). */
export async function getClassReport(classId: string): Promise<ClassReport> {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_class_report', {
    p_workspace_id: workspace.id,
    p_class_id: classId,
  });
  if (error) throw error;
  return classReportSchema.parse(data);
}

/** Per-curriculum-outcome correct rate for a class, or one student within it. */
export async function getOutcomeReport(
  classId: string,
  studentId?: string,
): Promise<OutcomeReportRow[]> {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_outcome_report', {
    p_workspace_id: workspace.id,
    p_class_id: classId,
    p_student_id: studentId ?? null,
  });
  if (error) throw error;
  return outcomeReportSchema.parse(data);
}

/** One student's scored online-exam attempts over time, oldest first. */
export async function getStudentProgress(studentId: string): Promise<StudentProgressRow[]> {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_student_progress', {
    p_workspace_id: workspace.id,
    p_student_id: studentId,
  });
  if (error) throw error;
  return studentProgressSchema.parse(data);
}

/** Curriculum topics with the lowest correct rate for a class, weakest first. */
export async function getWeakTopics(classId: string): Promise<WeakTopicRow[]> {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('get_weak_topics', {
    p_workspace_id: workspace.id,
    p_class_id: classId,
  });
  if (error) throw error;
  return weakTopicsSchema.parse(data);
}
