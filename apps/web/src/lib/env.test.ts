import { describe, expect, it } from 'vitest';

import { clientEnvSchema, parseEnv, serverEnvSchema } from './env';

const validClient = {
  NEXT_PUBLIC_SITE_URL: 'https://testcim.example',
  NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
};

describe('client environment', () => {
  it('accepts a complete configuration', () => {
    expect(parseEnv(clientEnvSchema, validClient, 'client').NEXT_PUBLIC_SITE_URL).toBe(
      'https://testcim.example',
    );
  });

  it('treats an empty optional variable as unset', () => {
    const parsed = parseEnv(
      clientEnvSchema,
      { ...validClient, NEXT_PUBLIC_SENTRY_DSN: '' },
      'client',
    );

    expect(parsed.NEXT_PUBLIC_SENTRY_DSN).toBeUndefined();
  });

  it('rejects a missing variable and names it', () => {
    expect(() =>
      parseEnv(
        clientEnvSchema,
        { ...validClient, NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined },
        'client',
      ),
    ).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });

  it('rejects a malformed url', () => {
    expect(() =>
      parseEnv(clientEnvSchema, { ...validClient, NEXT_PUBLIC_SITE_URL: 'not-a-url' }, 'client'),
    ).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });
});

describe('server environment', () => {
  it('defaults NODE_ENV to development', () => {
    const parsed = parseEnv(serverEnvSchema, { SUPABASE_SERVICE_ROLE_KEY: 'secret' }, 'server');

    expect(parsed.NODE_ENV).toBe('development');
  });

  it('rejects a missing service role key', () => {
    expect(() => parseEnv(serverEnvSchema, {}, 'server')).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('defaults the AI model ids and leaves the API key optional', () => {
    const parsed = parseEnv(serverEnvSchema, { SUPABASE_SERVICE_ROLE_KEY: 'secret' }, 'server');

    expect(parsed.AI_MODEL_QUALITY).toBe('claude-opus-5');
    expect(parsed.AI_MODEL_FAST).toBe('claude-haiku-4-5');
    expect(parsed.ANTHROPIC_API_KEY).toBeUndefined();
  });

  it('defaults Polar to the sandbox and leaves its credentials optional', () => {
    const parsed = parseEnv(serverEnvSchema, { SUPABASE_SERVICE_ROLE_KEY: 'secret' }, 'server');

    expect(parsed.POLAR_SERVER).toBe('sandbox');
    expect(parsed.POLAR_ACCESS_TOKEN).toBeUndefined();
    expect(parsed.POLAR_PRODUCT_PLUS_MONTH).toBeUndefined();
  });

  it('rejects an unknown Polar server', () => {
    expect(() =>
      parseEnv(
        serverEnvSchema,
        { SUPABASE_SERVICE_ROLE_KEY: 'secret', POLAR_SERVER: 'staging' },
        'server',
      ),
    ).toThrow(/POLAR_SERVER/);
  });

  it('does not describe any public variable', () => {
    // Guards against a secret schema drifting into the client bundle by accident.
    expect(Object.keys(serverEnvSchema.shape).some((key) => key.startsWith('NEXT_PUBLIC_'))).toBe(
      false,
    );
  });
});
