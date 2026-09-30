/**
 * Server-side deadline computation for one exam attempt (docs/prompts/09
 * item 3: "süre kontrolü sunucu saatiyle"). Pure so the join endpoint and
 * its tests can both call it without a clock dependency leaking in.
 */
export function computeDeadline(input: {
  readonly now: Date;
  readonly durationSec: number | null;
  readonly closesAt: Date | null;
}): Date | null {
  const candidates: Date[] = [];
  if (input.durationSec !== null) {
    candidates.push(new Date(input.now.getTime() + input.durationSec * 1000));
  }
  if (input.closesAt) {
    candidates.push(input.closesAt);
  }
  if (candidates.length === 0) return null;
  return new Date(Math.min(...candidates.map((d) => d.getTime())));
}

export function isPastDeadline(deadlineAt: Date | null, now: Date): boolean {
  if (!deadlineAt) return false;
  return now.getTime() > deadlineAt.getTime();
}

export function isWithinExamWindow(input: {
  readonly now: Date;
  readonly opensAt: Date | null;
  readonly closesAt: Date | null;
}): boolean {
  if (input.opensAt && input.now < input.opensAt) return false;
  if (input.closesAt && input.now > input.closesAt) return false;
  return true;
}
