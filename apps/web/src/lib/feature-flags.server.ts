import 'server-only';

import { isFeatureEnabled, parseFeatureFlags } from '@testcim/shared';

import { serverEnv } from '@/lib/env.server';

/** True when `flag` is rolled out to this workspace (see FEATURE_FLAGS in .env.example). */
export function isFlagEnabled(flag: string, workspaceId: string | undefined): boolean {
  return isFeatureEnabled(parseFeatureFlags(serverEnv.FEATURE_FLAGS), flag, workspaceId);
}
