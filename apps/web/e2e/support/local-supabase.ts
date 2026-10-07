import { randomUUID } from 'node:crypto';
import zlib from 'node:zlib';

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

/** Inserts one open-ended (free-text) question into the workspace bank. */
export async function seedOpenEndedQuestion(
  admin: AdminClient,
  teacher: TestTeacher,
  stemText: string,
  points = 1,
): Promise<SeededQuestion> {
  const inserted = unwrap(
    await admin
      .from('questions')
      .insert({
        workspace_id: teacher.workspaceId,
        created_by: teacher.userId,
        kind: 'rich',
        question_type: 'open',
        stem_text: stemText,
        options: [],
        correct: { question_type: 'open', rubric: 'Doğru terimleri kullanmış olmalı.' },
        points,
        difficulty: 1,
      })
      .select('id, current_revision')
      .single(),
    'questions',
  );

  const revision = unwrap(
    await admin
      .from('question_revisions')
      .select('id')
      .eq('question_id', inserted.id as string)
      .single(),
    'question_revisions',
  );

  return { id: inserted.id as string, revisionId: revision.id as string };
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

// ---------------------------------------------------------------------------
// Editor fixtures: a test whose questions are real images in local Storage.
// ---------------------------------------------------------------------------

function crc32(bytes: Uint8Array): number {
  return zlib.crc32(bytes);
}

function pngChunk(type: string, data: Uint8Array): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/**
 * A real, decodable PNG: a light card with a darker band per "option" so each question is
 * visibly different. No image library needed; the E2E only cares that the bytes are valid.
 */
export function makeQuestionPng(width: number, height: number, seed: number): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // RGB

  const rows: Buffer[] = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 3);
    const band = Math.floor((y / height) * 5);
    for (let x = 0; x < width; x += 1) {
      const dark =
        band % 2 === 1 && x > width * 0.08 && x < width * (0.4 + ((seed + band) % 5) * 0.1);
      row[1 + x * 3] = dark ? 60 + ((seed * 17) % 90) : 242;
      row[2 + x * 3] = dark ? 90 : 244;
      row[3 + x * 3] = dark ? 140 : 247;
    }
    rows.push(row);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

export interface SeededEditorTest {
  readonly testId: string;
  readonly itemIds: readonly string[];
}

/** A test with `count` image questions stored in the `assets` bucket, ready for the editor. */
export async function seedEditorTest(
  admin: AdminClient,
  teacher: TestTeacher,
  count: number,
  options: { readonly title?: string; readonly settings?: Record<string, unknown> } = {},
): Promise<SeededEditorTest> {
  const test = unwrap(
    await admin
      .from('tests')
      .insert({
        workspace_id: teacher.workspaceId,
        created_by: teacher.userId,
        title: options.title ?? 'Çarpanlara Ayırma Yazılısı',
        type: 'exam',
        question_count: count,
        ...(options.settings ? { settings: options.settings } : {}),
      })
      .select('id')
      .single(),
    'tests',
  );
  const testId = String(test.id);
  const itemIds: string[] = [];

  for (let index = 0; index < count; index += 1) {
    const width = 900;
    const height = 260 + (index % 4) * 110;
    const png = makeQuestionPng(width, height, index);
    const path = `${teacher.workspaceId}/${randomUUID()}.png`;

    const upload = await admin.storage
      .from('assets')
      .upload(path, png, { contentType: 'image/png' });
    if (upload.error) throw new Error(`storage upload: ${upload.error.message}`);

    const asset = unwrap(
      await admin
        .from('assets')
        .insert({
          workspace_id: teacher.workspaceId,
          owner_id: teacher.userId,
          bucket: 'assets',
          path,
          kind: 'image',
          mime: 'image/png',
          bytes: png.length,
          width,
          height,
          sha256: randomUUID().replaceAll('-', '').padEnd(64, '0'),
          source: 'paste',
        })
        .select('id')
        .single(),
      'assets',
    );

    const question = unwrap(
      await admin
        .from('questions')
        .insert({
          workspace_id: teacher.workspaceId,
          created_by: teacher.userId,
          kind: 'image',
          question_type: 'mcq',
          stem_asset_id: String(asset.id),
          options: [],
          correct: { question_type: 'mcq', option_id: 'ABCDE'[index % 5] },
          points: 1,
        })
        .select('id')
        .single(),
      'questions',
    );

    const revision = unwrap(
      await admin
        .from('question_revisions')
        .select('id')
        .eq('question_id', String(question.id))
        .order('revision', { ascending: false })
        .limit(1)
        .single(),
      'question_revisions',
    );

    const item = unwrap(
      await admin
        .from('test_items')
        .insert({
          workspace_id: teacher.workspaceId,
          test_id: testId,
          question_id: String(question.id),
          question_revision_id: String(revision.id),
          position: `a${String(index).padStart(3, '0')}`,
          // The editor reads the answer from the item, where choosing an answer writes it.
          correct_override: { question_type: 'mcq', option_id: 'ABCDE'[index % 5] },
        })
        .select('id')
        .single(),
      'test_items',
    );
    itemIds.push(String(item.id));
  }

  return { testId, itemIds };
}
