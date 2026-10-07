import { randomUUID } from 'node:crypto';

import { createClient } from '@supabase/supabase-js';

// The values below are the fixed demo credentials every `supabase start`
// installation ships with. They only work against a local stack and are public.
const LOCAL_URL = 'http://127.0.0.1:54321';
const LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const LOCAL_SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

export const E2E_PASSWORD = 'e2e-Passw0rd!';

export interface LocalSupabaseConfig {
  readonly url: string;
  readonly anonKey: string;
  readonly serviceRoleKey: string;
}

/**
 * The E2E fixture writes with the service role, so it must never reach a hosted
 * project (apps/web/.env.local points at one). Anything but a loopback host is
 * refused outright.
 */
export function assertLoopback(url: string): void {
  const host = new URL(url).hostname;
  if (host !== '127.0.0.1' && host !== 'localhost') {
    throw new Error(
      `E2E fixture refuses to use a non-local Supabase URL (${host}). Start the local stack with "pnpm db:start".`,
    );
  }
}

export function localSupabaseConfig(): LocalSupabaseConfig {
  const config = {
    url: process.env.E2E_SUPABASE_URL ?? LOCAL_URL,
    anonKey: process.env.E2E_SUPABASE_ANON_KEY ?? LOCAL_ANON_KEY,
    serviceRoleKey: process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ?? LOCAL_SERVICE_ROLE_KEY,
  };
  assertLoopback(config.url);
  return config;
}

export function createAdmin() {
  const { url, serviceRoleKey } = localSupabaseConfig();
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type AdminClient = ReturnType<typeof createAdmin>;

export interface TestTeacher {
  readonly userId: string;
  readonly email: string;
  readonly password: string;
  readonly workspaceId: string;
}

function unwrap<T>(
  result: { data: T; error: { message: string } | null },
  what: string,
): NonNullable<T> {
  if (result.error || result.data === null || result.data === undefined) {
    throw new Error(`${what}: ${result.error?.message ?? 'no data'}`);
  }
  return result.data;
}

/**
 * Creates a confirmed user. The `on_auth_user_created` trigger gives them a
 * personal workspace and an owner membership; onboarding is marked complete so
 * the app shell does not redirect to /onboarding.
 */
export async function createTeacher(admin: AdminClient): Promise<TestTeacher> {
  const email = `e2e-${randomUUID()}@example.test`;
  const created = await admin.auth.admin.createUser({
    email,
    password: E2E_PASSWORD,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    throw new Error(`createUser: ${created.error?.message ?? 'no user'}`);
  }
  const userId = created.data.user.id;

  const member = unwrap(
    await admin.from('workspace_members').select('workspace_id').eq('user_id', userId).single(),
    'workspace_members',
  );

  unwrap(
    await admin
      .from('profiles')
      .update({ onboarding: { completed: true } })
      .eq('id', userId)
      .select('id')
      .single(),
    'profiles',
  );

  return { userId, email, password: E2E_PASSWORD, workspaceId: member.workspace_id as string };
}

export async function deleteTeacher(admin: AdminClient, teacher: TestTeacher): Promise<void> {
  // Workspace data cascades from the workspace row; the user goes last.
  await admin.from('workspaces').delete().eq('id', teacher.workspaceId);
  await admin.auth.admin.deleteUser(teacher.userId);
}

function mcqOptions() {
  return [
    { id: 'a', text: 'Birinci seçenek' },
    { id: 'b', text: 'İkinci seçenek' },
    { id: 'c', text: 'Üçüncü seçenek' },
    { id: 'd', text: 'Dördüncü seçenek' },
  ];
}

export interface SeededQuestion {
  readonly id: string;
  readonly revisionId: string;
}

/** Inserts `count` multiple-choice questions into the workspace bank. */
export async function seedQuestions(
  admin: AdminClient,
  teacher: TestTeacher,
  count: number,
  stemFor: (index: number) => string,
): Promise<SeededQuestion[]> {
  const rows = Array.from({ length: count }, (_, index) => ({
    workspace_id: teacher.workspaceId,
    created_by: teacher.userId,
    kind: 'rich',
    question_type: 'mcq',
    stem_text: stemFor(index),
    options: mcqOptions(),
    option_count: 4,
    correct: { question_type: 'mcq', option_id: 'a' },
    points: 1,
    difficulty: 1 + (index % 5),
  }));
  const inserted = unwrap(
    await admin.from('questions').insert(rows).select('id, current_revision'),
    'questions',
  );

  const revisions = unwrap(
    await admin
      .from('question_revisions')
      .select('id, question_id, revision')
      .in(
        'question_id',
        inserted.map((q) => q.id as string),
      ),
    'question_revisions',
  );
  const revisionByQuestion = new Map(
    revisions.map((r) => [r.question_id as string, r.id as string]),
  );

  return inserted.map((q) => ({
    id: q.id as string,
    revisionId: revisionByQuestion.get(q.id as string) as string,
  }));
}

export interface SeededExam {
  readonly slug: string;
  readonly examId: string;
  readonly testId: string;
}

/** A test with `questions`, plus an open link-access online exam built from it. */
export async function seedOpenExam(
  admin: AdminClient,
  teacher: TestTeacher,
  questions: readonly SeededQuestion[],
): Promise<SeededExam> {
  const test = unwrap(
    await admin
      .from('tests')
      .insert({
        workspace_id: teacher.workspaceId,
        created_by: teacher.userId,
        title: 'E2E sınavı',
        type: 'exam',
        question_count: questions.length,
      })
      .select('id')
      .single(),
    'tests',
  );

  const testId = String(test.id);
  const slug = `e2e-${randomUUID().slice(0, 12)}`;
  const exam = unwrap(
    await admin
      .from('online_exams')
      .insert({
        workspace_id: teacher.workspaceId,
        test_id: testId,
        title: 'E2E sınavı',
        mode: 'async',
        access: 'link',
        slug,
        status: 'open',
        show_results: 'after_submit',
      })
      .select('id')
      .single(),
    'online_exams',
  );

  const examId = String(exam.id);

  unwrap(
    await admin
      .from('online_exam_items')
      .insert(
        questions.map((q, index) => ({
          workspace_id: teacher.workspaceId,
          online_exam_id: examId,
          question_id: q.id,
          question_revision_id: q.revisionId,
          position: String(index + 1).padStart(4, '0'),
        })),
      )
      .select('id'),
    'online_exam_items',
  );

  return { slug, examId, testId };
}
