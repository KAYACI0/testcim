export interface MentionableMember {
  readonly id: string;
  readonly fullName: string;
}

/**
 * Comments are a plain `<textarea>` (docs/prompts/12 plan: no rich-text
 * mention picker in v1), so `@mention` is matched as a literal, case-
 * insensitive `@<full name>` substring rather than parsed from any markup.
 * A member with no full name set can never be mentioned this way.
 */
export function parseMentionedUserIds(
  body: string,
  members: readonly MentionableMember[],
): string[] {
  const lowerBody = body.toLowerCase();
  const matched = new Set<string>();

  for (const member of members) {
    if (!member.fullName.trim()) continue;
    const needle = `@${member.fullName}`.toLowerCase();
    if (lowerBody.includes(needle)) {
      matched.add(member.id);
    }
  }

  return [...matched];
}
