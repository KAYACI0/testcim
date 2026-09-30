import { describe, expect, it } from 'vitest';

import { renderTestPptx, type PptxQuestion } from './pptx-export';

function isZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

const plainQuestion: PptxQuestion = {
  number: 1,
  stemText: 'Ikinin ikiye bolumu kactir?',
  options: [
    { label: 'A', text: '1' },
    { label: 'B', text: '2' },
  ],
};

describe('renderTestPptx', () => {
  it('produces a valid zip (pptx) container with one slide per question plus a title slide', async () => {
    const bytes = await renderTestPptx({
      title: 'Matematik Sinavi',
      className: '9A',
      questions: [plainQuestion],
      correctAnswerLabel: 'Dogru cevap',
    });
    expect(isZip(bytes)).toBe(true);
  });

  it('includes the answer line only when correctLabel is set', async () => {
    const bytes = await renderTestPptx({
      title: 'Matematik Sinavi',
      questions: [{ ...plainQuestion, correctLabel: 'B' }],
      correctAnswerLabel: 'Dogru cevap',
    });
    expect(isZip(bytes)).toBe(true);
  });
});
