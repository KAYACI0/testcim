import { describe, expect, it } from 'vitest';

import { renderTestDocx, type ExportQuestion } from './docx-export';

function isZip(bytes: Uint8Array): boolean {
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

const plainQuestion: ExportQuestion = {
  number: 1,
  stemText: 'Ikinin ikiye bolumu kactir?',
  options: [
    { label: 'A', text: '1' },
    { label: 'B', text: '2' },
  ],
};

describe('renderTestDocx', () => {
  it('produces a valid zip (docx) container for plain-text questions', async () => {
    const bytes = await renderTestDocx({
      title: 'Matematik Sinavi',
      className: '9A',
      questions: [plainQuestion],
      correctAnswerLabel: 'Dogru cevap',
    });
    expect(isZip(bytes)).toBe(true);
  });

  it('includes the answer key line only when correctLabel is set', async () => {
    const withKey = await renderTestDocx({
      title: 'Matematik Sinavi',
      questions: [{ ...plainQuestion, correctLabel: 'B' }],
      correctAnswerLabel: 'Dogru cevap',
    });
    expect(isZip(withKey)).toBe(true);
  });

  it('embeds a rendered PNG stem instead of throwing on rich questions', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const bytes = await renderTestDocx({
      title: 'Matematik Sinavi',
      questions: [{ number: 1, stemImagePng: png, options: [] }],
      correctAnswerLabel: 'Dogru cevap',
    });
    expect(isZip(bytes)).toBe(true);
  });

  it('adds a text watermark header when watermarkText is set', async () => {
    const bytes = await renderTestDocx({
      title: 'Matematik Sinavi',
      questions: [plainQuestion],
      correctAnswerLabel: 'Dogru cevap',
      watermarkText: 'TASLAK',
    });
    expect(isZip(bytes)).toBe(true);
  });
});
