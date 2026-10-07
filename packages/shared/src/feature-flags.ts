import { z } from 'zod';

/**
 * One rollout rule per flag. A flag that is absent or disabled is off for everyone, except
 * workspaces on its allow-list, which always get it. `percent` enables the flag for a stable
 * slice of workspaces (the same workspace always lands on the same side).
 */
export const featureFlagRuleSchema = z.object({
  enabled: z.boolean(),
  percent: z.number().min(0).max(100).optional(),
  workspaces: z.array(z.string().min(1)).optional(),
});

export type FeatureFlagRule = z.infer<typeof featureFlagRuleSchema>;

export const featureFlagsSchema = z.record(z.string().min(1), featureFlagRuleSchema);

export type FeatureFlags = z.infer<typeof featureFlagsSchema>;

/**
 * Parses the `FEATURE_FLAGS` JSON string. Anything missing or invalid yields no flags, so a
 * typo turns features off instead of taking the app down.
 */
export function parseFeatureFlags(raw: string | undefined): FeatureFlags {
  if (!raw || raw.trim() === '') {
    return {};
  }

  try {
    const result = featureFlagsSchema.safeParse(JSON.parse(raw));

    return result.success ? result.data : {};
  } catch {
    return {};
  }
}

/** FNV-1a, 32 bit: small, dependency free and stable across runtimes. */
function hashToBucket(input: string): number {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash % 100;
}

export function isFeatureEnabled(
  flags: FeatureFlags,
  flag: string,
  workspaceId: string | undefined,
): boolean {
  const rule = flags[flag];

  if (!rule) {
    return false;
  }

  if (workspaceId && rule.workspaces?.includes(workspaceId)) {
    return true;
  }

  if (!rule.enabled) {
    return false;
  }

  if (rule.percent === undefined || rule.percent >= 100) {
    return true;
  }

  if (!workspaceId) {
    return false;
  }

  return hashToBucket(`${flag}:${workspaceId}`) < rule.percent;
}
