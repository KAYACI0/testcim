import { createHash, randomBytes } from 'node:crypto';

import { isPastDeadline } from '@testcim/shared';

/**
 * Pure helpers used by the anonymous exam-taking routes, kept out of
 * anon.server.ts (which imports the admin Supabase client and therefore
 * `server-only`/env parsing) so they're unit-testable without a database —
 * same reasoning as `apps/web/src/features/crop/pdf-validate.ts`.
 */

export function examCookieName(slug: string): string {
  return `exam_tok_${slug}`;
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function hashIdentifier(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export interface ActiveAttempt {
  readonly id: string;
  readonly workspaceId: string;
  readonly onlineExamId: string;
  readonly deadlineAt: string | null;
  readonly status: 'in_progress' | 'submitted' | 'expired';
}

export function attemptIsWritable(attempt: ActiveAttempt): boolean {
  if (attempt.status !== 'in_progress') return false;
  return !isPastDeadline(attempt.deadlineAt ? new Date(attempt.deadlineAt) : null, new Date());
}
