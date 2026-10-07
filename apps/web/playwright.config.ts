import { defineConfig, devices } from '@playwright/test';

import { localSupabaseConfig } from './e2e/support/local-supabase';

// A dedicated port keeps E2E from ever reusing a regular `pnpm dev` server,
// which reads apps/web/.env.local and may point at a hosted Supabase project.
const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;
const supabase = localSupabaseConfig();

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['html'], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `pnpm exec next dev --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_SITE_URL: baseURL,
      NEXT_PUBLIC_SUPABASE_URL: supabase.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabase.anonKey,
      SUPABASE_SERVICE_ROLE_KEY: supabase.serviceRoleKey,
    },
  },
});
