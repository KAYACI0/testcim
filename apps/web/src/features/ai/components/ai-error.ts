/**
 * Turkish text for an action's failure reason. Falls back to the generic
 * message for a reason code that has no entry, so an unexpected server code
 * never shows as a raw key.
 */
export function aiErrorText(
  t: { (key: string): string; has: (key: string) => boolean },
  reason: string,
): string {
  const key = `errors.${reason}`;
  return t.has(key) ? t(key) : t('errors.unknown');
}
