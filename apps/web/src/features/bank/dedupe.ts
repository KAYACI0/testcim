/**
 * Pure decision logic behind `findDuplicates` (docs/prompts/08 item 6):
 * image questions are compared by `assets.sha256` (exact hash) through
 * `stem_asset_id`; questions with no asset fall back to an exact
 * `stem_text` match. Kept separate from the server action so the strategy
 * choice is unit-testable without a database.
 */
export type DuplicateLookupStrategy =
  | { readonly kind: 'sha256'; readonly value: string }
  | { readonly kind: 'stem_text'; readonly value: string }
  | { readonly kind: 'none' };

export function resolveDuplicateLookup(input: {
  readonly sha256: string | null;
  readonly stemText: string | null;
}): DuplicateLookupStrategy {
  if (input.sha256) {
    return { kind: 'sha256', value: input.sha256 };
  }
  const trimmed = input.stemText?.trim();
  if (trimmed) {
    return { kind: 'stem_text', value: trimmed };
  }
  return { kind: 'none' };
}
