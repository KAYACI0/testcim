import { describe, expect, it } from 'vitest';

import type { RichDoc } from '@testcim/shared';

import { richDocToHtml } from './doc-to-html';

describe('richDocToHtml', () => {
  it('renders a paragraph with bold and italic marks', () => {
    const doc: RichDoc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'kesir: ', marks: [] },
            { type: 'text', text: 'bir', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' bölü ', marks: [] },
            { type: 'text', text: 'iki', marks: [{ type: 'italic' }] },
          ],
        },
      ],
    };
    const html = richDocToHtml(doc);
    expect(html).toBe('<p>kesir: <strong>bir</strong> bölü <em>iki</em></p>');
  });

  it('escapes HTML-special characters in plain text', () => {
    const doc: RichDoc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x < y & y > z' }] }],
    };
    expect(richDocToHtml(doc)).toBe('<p>x &lt; y &amp; y &gt; z</p>');
  });

  it('renders an equation node with KaTeX output', () => {
    const doc: RichDoc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'equation', attrs: { latex: '\\frac{1}{2}' } }] },
      ],
    };
    const html = richDocToHtml(doc);
    expect(html).toContain('katex');
  });

  it('renders a drawing node by inlining its stored SVG verbatim', () => {
    const doc: RichDoc = {
      type: 'doc',
      content: [{ type: 'drawing', attrs: { svg: '<svg><circle r="1" /></svg>' } }],
    };
    expect(richDocToHtml(doc)).toBe('<div><svg><circle r="1" /></svg></div>');
  });
});
