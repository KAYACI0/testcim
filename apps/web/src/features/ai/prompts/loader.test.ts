import { describe, expect, it } from 'vitest';

import { loadPromptTemplate } from './loader';

describe('loadPromptTemplate', () => {
  it('reads a template file from this directory as plain text', () => {
    const content = loadPromptTemplate('__fixtures__/example.v1.md');

    expect(content).toContain('test fikstürüdür');
  });

  it('throws for a missing file instead of returning an empty string', () => {
    expect(() => loadPromptTemplate('__fixtures__/does-not-exist.v1.md')).toThrow();
  });
});
