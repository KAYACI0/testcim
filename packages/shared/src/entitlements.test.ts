import { describe, expect, it } from 'vitest';

import { can, isWithinLimit, limit, remainingRatio, UNLIMITED } from './entitlements';

import type { Entitlements } from './schemas';

const freeEntitlements: Entitlements = {
  questions_per_test: 20,
  pdf_exports_per_month: 10,
  versions_per_test: 2,
  bank_questions: 100,
  storage_mb: 250,
  ai_credits_per_month: 10,
  omr_scans_per_month: 30,
  online_participants_per_exam: 20,
  live_exams_concurrent: 1,
  advanced_layout: 'basic',
  remove_branding: false,
  docx_pptx_export: false,
  iframe_embed: false,
  seats: 1,
  api_webhooks: false,
};

const proEntitlements: Entitlements = {
  ...freeEntitlements,
  pdf_exports_per_month: UNLIMITED,
  docx_pptx_export: true,
};

describe('can', () => {
  it('reads a boolean entitlement', () => {
    expect(can(freeEntitlements, 'docx_pptx_export')).toBe(false);
    expect(can(proEntitlements, 'docx_pptx_export')).toBe(true);
  });
});

describe('limit', () => {
  it('reads a numeric cap', () => {
    expect(limit(freeEntitlements, 'questions_per_test')).toBe(20);
  });
});

describe('isWithinLimit', () => {
  it('treats -1 as unlimited', () => {
    expect(isWithinLimit(1_000_000, UNLIMITED)).toBe(true);
  });

  it('rejects usage at or above a finite cap', () => {
    expect(isWithinLimit(20, 20)).toBe(false);
    expect(isWithinLimit(19, 20)).toBe(true);
  });
});

describe('remainingRatio', () => {
  it('is 1 for an unlimited cap', () => {
    expect(remainingRatio(999, UNLIMITED)).toBe(1);
  });

  it('shrinks toward 0 as usage approaches the cap', () => {
    expect(remainingRatio(18, 20)).toBeCloseTo(0.1);
    expect(remainingRatio(20, 20)).toBe(0);
  });

  it('never goes negative when usage exceeds the cap', () => {
    expect(remainingRatio(25, 20)).toBe(0);
  });
});
