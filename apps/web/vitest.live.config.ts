import path from 'node:path';

import { defineConfig } from 'vitest/config';

/**
 * Live checks against real external APIs. Never part of `pnpm test`; run with
 * `pnpm test:ai-live` and a real ANTHROPIC_API_KEY in the environment.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      'server-only': path.resolve(
        import.meta.dirname,
        'src/features/ai/__live__/server-only-stub.ts',
      ),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.live.ts'],
    testTimeout: 60_000,
  },
});
