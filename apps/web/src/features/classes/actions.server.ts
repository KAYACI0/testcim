'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { rosterImportInputSchema } from '@testcim/shared';

import { computeDefaultRetentionUntil } from './import';

import { requireSession } from '@/lib/auth/dal';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/current';
import { requireRole } from '@/lib/workspace/entitlements.server';

export interface CreateClassState {
  readonly status: 'idle' | 'error';
  readonly message?: string;
}

const createClassSchema = z.object({
  name: z.string().trim().min(1).max(200),
  grade: z.coerce.number().int().min(1).max(12).optional(),
  schoolYear: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{4}$/)
    .optional(),
});

/** Creates a class. `retention_until` defaults from the school year (end + 1 year); editable afterwards. */
export async function createClass(
  _prev: CreateClassState,
  formData: FormData,
): Promise<CreateClassState> {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);

  const parsed = createClassSchema.safeParse({
    name: formData.get('name'),
    grade: formData.get('grade') || undefined,
    schoolYear: formData.get('schoolYear') || undefined,
  });
  if (!parsed.success) return { status: 'error', message: 'invalid_input' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('classes')
    .insert({
      workspace_id: workspace.id,
      name: parsed.data.name,
      grade: parsed.data.grade ?? null,
      school_year: parsed.data.schoolYear ?? null,
      retention_until: computeDefaultRetentionUntil(parsed.data.schoolYear ?? null),
    })
    .select('id')
    .single();
  if (error || !data) return { status: 'error', message: error?.message ?? 'create_failed' };

  redirect(`/classes/${data.id}`);
}

const updateRetentionSchema = z.object({
  classId: z.uuid(),
  retentionUntil: z.iso.date().nullable(),
});

/** Sets or clears (`null` = indefinite) a class's retention date. */
export async function updateRetention(rawInput: unknown) {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);

  const parsed = updateRetentionSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('classes')
    .update({ retention_until: parsed.data.retentionUntil })
    .eq('id', parsed.data.classId)
    .eq('workspace_id', workspace.id);
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

/** Archives a class (soft — the roster and its result links are untouched). */
export async function archiveClass(classId: string) {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);

  const supabase = await createClient();
  const { error } = await supabase
    .from('classes')
    .update({ archived: true })
    .eq('id', classId)
    .eq('workspace_id', workspace.id);
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

const singleStudentSchema = z.object({
  classId: z.uuid(),
  studentNo: z.string().trim().max(50).optional(),
  fullName: z.string().trim().min(1).max(200),
});

/** Adds one student directly (outside a roster import) and links it to the class. */
export async function addStudent(rawInput: unknown) {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);

  const parsed = singleStudentSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('students')
    .insert({
      workspace_id: workspace.id,
      student_no: parsed.data.studentNo ?? null,
      full_name: parsed.data.fullName,
    })
    .select('id')
    .single();
  if (error || !data) return { ok: false as const, reason: error?.message ?? 'insert_failed' };

  const { error: linkError } = await supabase
    .from('class_students')
    .insert({ workspace_id: workspace.id, class_id: parsed.data.classId, student_id: data.id });
  if (linkError) return { ok: false as const, reason: linkError.message };
  return { ok: true as const, studentId: data.id };
}

const updateStudentSchema = z.object({
  studentId: z.uuid(),
  studentNo: z.string().trim().max(50).optional(),
  fullName: z.string().trim().min(1).max(200),
});

export async function updateStudent(rawInput: unknown) {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);

  const parsed = updateStudentSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };

  const supabase = await createClient();
  const { error } = await supabase
    .from('students')
    .update({ student_no: parsed.data.studentNo ?? null, full_name: parsed.data.fullName })
    .eq('id', parsed.data.studentId)
    .eq('workspace_id', workspace.id);
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

/** Soft-archives one student (hidden from rosters, not deleted — use `bulkDeleteStudents` to remove permanently). */
export async function archiveStudent(studentId: string) {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);

  const supabase = await createClient();
  const { error } = await supabase
    .from('students')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', studentId)
    .eq('workspace_id', workspace.id);
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

/**
 * Imports an already column-mapped, already-validated roster in one batch
 * RPC call (`bulk_import_students`) — never row by row, so a 300-row class
 * list stays fast and transactional.
 */
export async function importRoster(rawInput: unknown) {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin', 'editor']);

  const parsed = rosterImportInputSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('bulk_import_students', {
    p_workspace_id: workspace.id,
    p_class_id: parsed.data.classId,
    p_rows: parsed.data.rows.map((row) => ({
      student_no: row.studentNo ?? null,
      full_name: row.fullName,
    })),
  });
  if (error) return { ok: false as const, reason: error.message };

  return { ok: true as const, inserted: data.inserted, linked: data.linked };
}

const bulkDeleteSchema = z.object({
  studentIds: z.array(z.uuid()).min(1).max(500),
});

/** Permanently deletes students (owner/admin only); results keep the row, just unlinked. */
export async function bulkDeleteStudents(rawInput: unknown) {
  await requireSession();
  const workspace = await getCurrentWorkspace();
  await requireRole(workspace.id, ['owner', 'admin']);

  const parsed = bulkDeleteSchema.safeParse(rawInput);
  if (!parsed.success) return { ok: false as const, reason: 'invalid_input' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('bulk_delete_students', {
    p_workspace_id: workspace.id,
    p_student_ids: parsed.data.studentIds,
  });
  if (error) return { ok: false as const, reason: error.message };
  return { ok: true as const };
}

export interface ClassRow {
  readonly id: string;
  readonly name: string;
  readonly grade: number | null;
  readonly school_year: string | null;
  readonly archived: boolean;
  readonly retention_until: string | null;
  readonly student_count: number;
}

export async function listClasses(): Promise<ClassRow[]> {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, grade, school_year, archived, retention_until')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false });

  if (!classes || classes.length === 0) return [];

  const admin = createAdminClient();
  const { data: links } = await admin
    .from('class_students')
    .select('class_id')
    .eq('workspace_id', workspace.id)
    .in(
      'class_id',
      classes.map((c) => c.id),
    );

  const countByClassId = new Map<string, number>();
  for (const link of links ?? []) {
    countByClassId.set(link.class_id, (countByClassId.get(link.class_id) ?? 0) + 1);
  }

  return classes.map((c) => ({ ...c, student_count: countByClassId.get(c.id) ?? 0 }));
}

export interface StudentRow {
  readonly id: string;
  readonly student_no: string | null;
  readonly full_name: string;
}

export interface ClassRosterData {
  readonly className: string;
  readonly retentionUntil: string | null;
  readonly students: readonly StudentRow[];
}

export async function getClassRoster(classId: string): Promise<ClassRosterData | null> {
  const workspace = await getCurrentWorkspace();
  const supabase = await createClient();

  const { data: klass } = await supabase
    .from('classes')
    .select('id, name, retention_until')
    .eq('id', classId)
    .eq('workspace_id', workspace.id)
    .single();
  if (!klass) return null;

  const { data: links } = await supabase
    .from('class_students')
    .select('student_id')
    .eq('class_id', classId);

  const studentIds = (links ?? []).map((l) => l.student_id);
  if (studentIds.length === 0) {
    return { className: klass.name, retentionUntil: klass.retention_until, students: [] };
  }

  const { data: students } = await supabase
    .from('students')
    .select('id, student_no, full_name')
    .in('id', studentIds)
    .is('archived_at', null)
    .order('full_name', { ascending: true });

  return {
    className: klass.name,
    retentionUntil: klass.retention_until,
    students: students ?? [],
  };
}
