/** Feature list shown on the home and features pages; wording lives in `marketing.featureItems`. */
export const FEATURE_KEYS = [
  'capture',
  'crop',
  'layout',
  'export',
  'bank',
  'booklets',
  'omr',
  'online',
  'reports',
  'team',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];
