import { describe, expect, it } from 'vitest';

import { richDocToPlainText } from './rich-doc-text';

import type { RichDoc } from './schemas';

describe('richDocToPlainText', () => {
  it('flattens nested paragraph/text nodes with a single space', () => {
    const doc: RichDoc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Metni  oku' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 've sorulari cevapla.' }] },
      ],
    };
    expect(richDocToPlainText(doc)).toBe('Metni oku ve sorulari cevapla.');
  });

  it('returns an empty string for null, undefined or an empty doc', () => {
    expect(richDocToPlainText(null)).toBe('');
    expect(richDocToPlainText(undefined)).toBe('');
    expect(richDocToPlainText({ type: 'doc', content: [] })).toBe('');
  });

  it('skips non-text nodes (e.g. an equation atom) without throwing', () => {
    const doc: RichDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Deger: ' },
            { type: 'equation', attrs: { latex: 'x^2' } },
          ],
        },
      ],
    };
    expect(richDocToPlainText(doc)).toBe('Deger:');
  });
});
