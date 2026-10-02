/** Entitlement keys shown on the pricing page, in display order (docs/01 section 6). */
export const ENTITLEMENT_ROWS = [
  { key: 'questions_per_test', kind: 'number' },
  { key: 'pdf_exports_per_month', kind: 'number' },
  { key: 'versions_per_test', kind: 'number' },
  { key: 'bank_questions', kind: 'number' },
  { key: 'storage_mb', kind: 'storage' },
  { key: 'ai_credits_per_month', kind: 'number' },
  { key: 'omr_scans_per_month', kind: 'number' },
  { key: 'online_participants_per_exam', kind: 'number' },
  { key: 'live_exams_concurrent', kind: 'number' },
  { key: 'advanced_layout', kind: 'tier' },
  { key: 'remove_branding', kind: 'flag' },
  { key: 'docx_pptx_export', kind: 'flag' },
  { key: 'iframe_embed', kind: 'flag' },
  { key: 'seats', kind: 'number' },
  { key: 'api_webhooks', kind: 'flag' },
] as const;

export type EntitlementRow = (typeof ENTITLEMENT_ROWS)[number];

export type CellValue =
  | { readonly type: 'number'; readonly value: number }
  | { readonly type: 'storage'; readonly megabytes: number }
  | { readonly type: 'unlimited' }
  | { readonly type: 'pooled' }
  | { readonly type: 'fairUse' }
  | { readonly type: 'yes' }
  | { readonly type: 'no' }
  | { readonly type: 'tier'; readonly tier: 'basic' | 'full' };

/** Turns one raw entitlement value into a typed cell; wording is resolved where messages are available. */
export function toCell(row: EntitlementRow, raw: unknown): CellValue {
  if (row.kind === 'flag') {
    return raw === true ? { type: 'yes' } : { type: 'no' };
  }
  if (row.kind === 'tier') {
    return { type: 'tier', tier: raw === 'full' ? 'full' : 'basic' };
  }
  if (typeof raw !== 'number') {
    return { type: 'no' };
  }
  if (raw < 0) {
    if (row.key === 'ai_credits_per_month') return { type: 'pooled' };
    if (row.key === 'omr_scans_per_month') return { type: 'fairUse' };
    return { type: 'unlimited' };
  }
  return row.kind === 'storage'
    ? { type: 'storage', megabytes: raw }
    : { type: 'number', value: raw };
}
