import { describe, expect, it } from 'vitest';

import type { ExportImage } from '@testcim/renderers/export';

import { buildExportData } from './build-export-data';

const image: ExportImage = { bytes: new Uint8Array([1]), format: 'png', width: 800, height: 300 };

describe('buildExportData', () => {
  const questions = [
    { id: 'a', correctLabel: 'B' },
    { id: 'b', correctLabel: null },
    { id: 'c', correctLabel: 'D' },
  ];

  it('numbers questions in paper order and attaches their pictures', () => {
    const data = buildExportData({
      title: 'Yazılı',
      className: '8-A',
      questions,
      images: new Map([
        ['a', image],
        ['c', image],
      ]),
      includeAnswers: false,
      correctAnswerLabel: 'Doğru cevap',
    });

    expect(data.title).toBe('Yazılı');
    expect(data.className).toBe('8-A');
    expect(data.questions.map((q) => q.number)).toEqual([1, 2, 3]);
    expect(data.questions.map((q) => q.stemImage !== undefined)).toEqual([true, false, true]);
  });

  it('carries the answers only when asked, and only where a key exists', () => {
    const base = {
      title: 'Y',
      className: '',
      questions,
      images: new Map<string, ExportImage>(),
      correctAnswerLabel: 'Doğru cevap',
    };

    const without = buildExportData({ ...base, includeAnswers: false });
    expect(without.questions.every((q) => q.correctLabel === undefined)).toBe(true);

    const withKey = buildExportData({ ...base, includeAnswers: true });
    expect(withKey.questions.map((q) => q.correctLabel)).toEqual(['B', undefined, 'D']);
    expect(withKey.className).toBeUndefined();
  });

  it('is empty for a test without questions', () => {
    const data = buildExportData({
      title: 'Boş',
      className: '',
      questions: [],
      images: new Map(),
      includeAnswers: true,
      correctAnswerLabel: 'x',
    });
    expect(data.questions).toEqual([]);
  });
});
