import type { Entitlements } from './schemas';

/** Entitlement keys whose value is a usage cap (`-1` means unlimited). */
export const NUMERIC_ENTITLEMENT_KEYS = [
  'questions_per_test',
  'pdf_exports_per_month',
  'versions_per_test',
  'bank_questions',
  'storage_mb',
  'ai_credits_per_month',
  'omr_scans_per_month',
  'online_participants_per_exam',
  'live_exams_concurrent',
  'seats',
] as const satisfies readonly (keyof Entitlements)[];

export type NumericEntitlementKey = (typeof NUMERIC_ENTITLEMENT_KEYS)[number];

/** Entitlement keys whose value is a plain on/off flag. */
export const BOOLEAN_ENTITLEMENT_KEYS = [
  'remove_branding',
  'docx_pptx_export',
  'iframe_embed',
  'api_webhooks',
] as const satisfies readonly (keyof Entitlements)[];

export type BooleanEntitlementKey = (typeof BOOLEAN_ENTITLEMENT_KEYS)[number];

/** `-1` is the "unlimited" sentinel used throughout `plans.entitlements`. */
export const UNLIMITED = -1;

/** Whether a plain on/off entitlement is granted. */
export function can(entitlements: Entitlements, key: BooleanEntitlementKey): boolean {
  return entitlements[key];
}

/** The numeric cap for a usage-style entitlement (`-1` = unlimited). */
export function limit(entitlements: Entitlements, key: NumericEntitlementKey): number {
  return entitlements[key];
}

/** Whether `current` still fits under `cap`, treating `-1` as unlimited. */
export function isWithinLimit(current: number, cap: number): boolean {
  return cap === UNLIMITED || current < cap;
}

/**
 * How close `current` is to `cap`, as a 0–1 ratio. Unlimited caps never
 * approach their limit, so `UpgradeNote`-style "yaklaşıyorsunuz" copy can key
 * off `remainingRatio(...) <= 0.1`.
 */
export function remainingRatio(current: number, cap: number): number {
  if (cap === UNLIMITED || cap <= 0) {
    return 1;
  }

  return Math.max(0, (cap - current) / cap);
}
