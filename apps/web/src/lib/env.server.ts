import 'server-only';

import { parseEnv, serverEnvSchema, type ServerEnv } from './env';

/**
 * Server-only environment. Importing this module from a client component is a build
 * error thanks to server-only, so secrets cannot reach the browser bundle.
 */
export const serverEnv: ServerEnv = parseEnv(serverEnvSchema, process.env, 'server');
