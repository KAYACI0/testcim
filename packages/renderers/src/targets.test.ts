import { describe, expect, it } from 'vitest';

import { RENDER_TARGETS, isRenderTarget } from './targets';

describe('render targets', () => {
  it('covers every output the layout engine feeds', () => {
    expect([...RENDER_TARGETS]).toEqual(['html', 'pdf', 'docx', 'pptx']);
  });

  it('narrows known targets', () => {
    expect(isRenderTarget('pdf')).toBe(true);
    expect(isRenderTarget('xlsx')).toBe(false);
  });
});
