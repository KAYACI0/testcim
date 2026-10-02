import { describe, expect, it } from 'vitest';

import { ENTITLEMENT_ROWS, toCell } from './entitlement-rows';

const row = (key: string) => ENTITLEMENT_ROWS.find((entry) => entry.key === key)!;

describe('toCell', () => {
  it('maps negative numbers to unlimited, except the pooled and fair-use keys', () => {
    expect(toCell(row('pdf_exports_per_month'), -1)).toEqual({ type: 'unlimited' });
    expect(toCell(row('ai_credits_per_month'), -1)).toEqual({ type: 'pooled' });
    expect(toCell(row('omr_scans_per_month'), -1)).toEqual({ type: 'fairUse' });
  });

  it('keeps finite numbers and tags storage separately', () => {
    expect(toCell(row('questions_per_test'), 20)).toEqual({ type: 'number', value: 20 });
    expect(toCell(row('storage_mb'), 250)).toEqual({ type: 'storage', megabytes: 250 });
  });

  it('reads flags and tiers', () => {
    expect(toCell(row('remove_branding'), true)).toEqual({ type: 'yes' });
    expect(toCell(row('remove_branding'), false)).toEqual({ type: 'no' });
    expect(toCell(row('advanced_layout'), 'full')).toEqual({ type: 'tier', tier: 'full' });
    expect(toCell(row('advanced_layout'), 'basic')).toEqual({ type: 'tier', tier: 'basic' });
  });

  it('treats a missing value as not included', () => {
    expect(toCell(row('questions_per_test'), undefined)).toEqual({ type: 'no' });
  });
});
