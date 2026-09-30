// No `server-only` marker: `node:fs` already can't bundle into a client
// component, and this file needs to stay importable under vitest's jsdom
// test environment, where the `server-only` stub throws unconditionally.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROMPTS_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * Reads a versioned system prompt template from this directory as plain
 * text (see README.md for the naming convention). Throws if the file is
 * missing — a typo in a prompt filename should fail loudly, not silently
 * fall back to an empty system prompt.
 */
export function loadPromptTemplate(filename: string): string {
  return readFileSync(join(PROMPTS_DIR, filename), 'utf-8');
}
