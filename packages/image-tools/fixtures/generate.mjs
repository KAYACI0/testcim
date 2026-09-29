// Generates synthetic, telif-free (copyright-free) fixture PDFs used by
// pdf-split.fixtures.test.ts to measure the real detection rate of
// splitTextLayer() against pdfjs-dist's actual getTextContent() output
// (docs/prompts/06-pdf-kirpma-studyosu.md kabul kriteri: metin katmanlı bir
// sayfada sorular en az %90 tek tıkla doğru kutuyla önerilmeli).
//
// Idempotent: re-run any time after editing this file to regenerate the
// committed .pdf fixtures.
//
//   node fixtures/generate.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PDFDocument, StandardFonts } from 'pdf-lib';

const dir = dirname(fileURLToPath(import.meta.url));

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;

function loremQuestion(n) {
  return `Text for question ${n} here.`;
}

async function singleColumn() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const size = 11;
  let y = PAGE_HEIGHT - MARGIN;
  const numbers = [];

  for (let n = 1; n <= 6; n += 1) {
    page.drawText(`${n}.`, { x: MARGIN, y, size, font });
    page.drawText(loremQuestion(n), { x: MARGIN + 24, y, size, font });
    numbers.push(n);
    y -= 90;
  }

  return { doc, expected: { 1: numbers } };
}

async function twoColumn() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const size = 11;
  const colLeft = MARGIN;
  const colRight = PAGE_WIDTH / 2 + 40;
  const rows = 4;
  let n = 1;
  const numbers = [];

  for (let row = 0; row < rows; row += 1) {
    const y = PAGE_HEIGHT - MARGIN - row * 110;
    page.drawText(`${n}.`, { x: colLeft, y, size, font });
    page.drawText(loremQuestion(n), { x: colLeft + 24, y, size, font });
    numbers.push(n);
    n += 1;
    page.drawText(`${n}.`, { x: colRight, y, size, font });
    page.drawText(loremQuestion(n), { x: colRight + 24, y, size, font });
    numbers.push(n);
    n += 1;
  }

  return { doc, expected: { 1: numbers } };
}

async function withPassage() {
  // A shared-passage block (docs/02 §6 "test_groups"): a paragraph followed
  // by two questions that reference it. The paragraph itself must NOT be
  // detected as a question start.
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const size = 11;
  let y = PAGE_HEIGHT - MARGIN;
  const numbers = [];

  page.drawText('1. Read the passage below and answer the questions.', {
    x: MARGIN,
    y,
    size,
    font,
  });
  y -= 20;
  page.drawText('A long reading passage goes here and it runs for a', {
    x: MARGIN,
    y,
    size,
    font,
  });
  y -= 20;
  page.drawText('few lines, said to have started in the year 2023.', {
    x: MARGIN,
    y,
    size,
    font,
  });
  numbers.push(1);
  y -= 60;

  for (let n = 2; n <= 3; n += 1) {
    page.drawText(`${n}.`, { x: MARGIN, y, size, font });
    page.drawText(loremQuestion(n), { x: MARGIN + 24, y, size, font });
    numbers.push(n);
    y -= 90;
  }

  return { doc, expected: { 1: numbers } };
}

async function answerKey() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const questionsPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const size = 11;
  let y = PAGE_HEIGHT - MARGIN;
  const numbers = [];
  const letters = ['A', 'B', 'C', 'D', 'A'];

  for (let n = 1; n <= 5; n += 1) {
    questionsPage.drawText(`${n}.`, { x: MARGIN, y, size, font });
    questionsPage.drawText(loremQuestion(n), { x: MARGIN + 24, y, size, font });
    numbers.push(n);
    y -= 90;
  }

  const answerPage = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const tableText = numbers.map((n, i) => `${n}-${letters[i]}`).join('   ');
  answerPage.drawText('Answer key', { x: MARGIN, y: PAGE_HEIGHT - MARGIN, size, font });
  answerPage.drawText(tableText, { x: MARGIN, y: PAGE_HEIGHT - MARGIN - 30, size, font });

  return {
    doc,
    expected: { 1: numbers },
    answerKey: numbers.map((n, i) => ({ number: n, letter: letters[i] })),
  };
}

async function main() {
  const fixtures = {
    'single-column': await singleColumn(),
    'two-column': await twoColumn(),
    'with-passage': await withPassage(),
    'answer-key': await answerKey(),
  };

  const manifest = {};
  for (const [name, { doc, expected, answerKey: key }] of Object.entries(fixtures)) {
    const bytes = await doc.save();
    writeFileSync(join(dir, `${name}.pdf`), bytes);
    manifest[name] = { expectedNumbersByPage: expected, ...(key ? { answerKey: key } : {}) };
    console.warn(`Generated ${name}.pdf`);
  }

  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.warn('Wrote manifest.json');
}

await main();
