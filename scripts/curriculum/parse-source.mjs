// Extracts topic/outcome structure from an official MEB curriculum PDF
// (Türkiye Yüzyılı Maarif Modeli 2026 format: "N. TEMA:"/"N. ÜNİTE:" headers,
// "SUBJECT.grade.topic.outcome." outcome codes) into the JSON shape consumed
// by scripts/curriculum/import.ts.
//
// This does NOT invent or fill in missing data: only text present in the PDF
// is extracted. Output should be spot-checked against the source PDF before
// being committed under scripts/curriculum/data/ (see coverage_note fields
// in the existing data files for what is intentionally left out).
//
// Usage:
//   node scripts/curriculum/parse-source.mjs <pdf-path> <subject-code> \
//     '{"5":<startPage>,"6":<startPage>,...,"end":<lastPage+1>}' \
//     [unitWord=TEMA] [unitVerb=temada]
//
// Grade start pages come from the PDF's own table of contents (İçindekiler).
// pdfjs-dist must be resolvable (run from apps/web, which depends on it).

import { readFile, writeFile } from 'node:fs/promises';

import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const [, , pdfPath, subjectCode, gradeStartsJson, unitWord = 'TEMA', unitVerb = 'temada'] =
  process.argv;

if (!pdfPath || !subjectCode || !gradeStartsJson) {
  console.error(
    'Usage: node parse-source.mjs <pdf-path> <subject-code> <gradeStartsJson> [unitWord] [unitVerb]',
  );
  process.exit(1);
}

const bounds = JSON.parse(gradeStartsJson);

async function extractPages(path) {
  const data = new Uint8Array(await readFile(path));
  const doc = await getDocument({ data, useSystemFonts: true, disableFontFace: true }).promise;
  const pages = new Map();
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.set(i, content.items.map((it) => it.str).join(' '));
  }
  return pages;
}

function blockFor(pages, startPage, endPage) {
  let s = '';
  for (let p = startPage; p < endPage; p += 1) {
    if (pages.has(p)) s += `\n${pages.get(p)}`;
  }
  return s;
}

const LOWERCASE_WORDS = new Set(['ve', 'ile', 'de', 'da', 'ya', 'için']);
function trTitleCase(s) {
  return s
    .toLocaleLowerCase('tr-TR')
    .split(' ')
    .map((w, i) => {
      if (!w) return w;
      if (i > 0 && LOWERCASE_WORDS.has(w)) return w;
      return w[0].toLocaleUpperCase('tr-TR') + w.slice(1);
    })
    .join(' ');
}

function dehyphenate(s) {
  return s
    .replace(/\s+/g, ' ')
    .replace(/(\p{L})\s-\s+(\p{Ll})/gu, '$1$2')
    .trim();
}

const pages = await extractPages(pdfPath);

const themaRe = new RegExp(`(\\d+)\\.\\s*${unitWord}:\\s*(.*?)\\s{2,}Bu\\s+${unitVerb}`, 'g');
const outcomeRe = /([A-ZÇĞİÖŞÜ]+)\.(\d)\.(\d+)\.(\d+)\.\s+(.*?)\s+a\)\s/gs;

const gradeOrder = Object.keys(bounds)
  .filter((k) => k !== 'end')
  .map(Number)
  .sort((a, b) => a - b);

const topics = new Map();
const outcomes = [];

for (const grade of gradeOrder) {
  const startPage = bounds[String(grade)];
  const nextGrade = gradeOrder[gradeOrder.indexOf(grade) + 1];
  const endPage = nextGrade ? bounds[String(nextGrade)] : bounds.end;
  const block = blockFor(pages, startPage, endPage);

  for (const t of block.matchAll(themaRe)) {
    const themaNum = t[1];
    const name = trTitleCase(dehyphenate(t[2].replace(/\s*\(\d+\)\s*$/, '')));
    const code = `${subjectCode}.${grade}.${themaNum}`;
    if (!topics.has(code)) topics.set(code, { code, name, grade, parent_code: null });
  }

  for (const o of block.matchAll(outcomeRe)) {
    const [, subj, g, thema, idx, titleRaw] = o;
    if (Number(g) !== grade) continue;
    const code = `${subj}.${g}.${thema}.${idx}`;
    const description = dehyphenate(titleRaw);
    if (description.length < 5 || description.length > 400) continue;
    outcomes.push({ code, grade, topic_code: `${subj}.${g}.${thema}`, description });
  }
}

const result = { topics: [...topics.values()], outcomes };
const outPath = pdfPath.replace(/\.pdf$/i, '.extracted.json');
await writeFile(outPath, JSON.stringify(result, null, 2), 'utf8');
console.warn(
  `Wrote ${result.topics.length} topics, ${result.outcomes.length} outcomes to ${outPath}`,
);
console.warn(
  'Review the output against the source PDF before merging into scripts/curriculum/data/.',
);
