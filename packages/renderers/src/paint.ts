import type {
  LayoutBlock,
  LayoutFooter,
  LayoutHeader,
  LayoutMetrics,
} from '@testcim/layout-engine';
import type { PdfFontWeight, TextMeasure } from '@testcim/pdf-fonts';

import type {
  PaintCommand,
  PaintDocument,
  PaintExtra,
  PaintPage,
  TestPaintContent,
} from './paint-types';

const MM_PER_PT = 25.4 / 72;

/** Plex's ascent is 1.025 em; a 1.3 line box leaves no extra leading above the baseline. */
export const TEXT_LINE_BOX = 1.3;

/** Space between the header and the first question, and between the last question and the footer. */
export const HEADER_BODY_GAP_MM = 6;
export const FOOTER_GAP_MM = 3;

const RULE_MM = 0.2;
const STRONG_RULE_MM = 0.35;

export function lineBoxMm(sizePt: number): number {
  return sizePt * TEXT_LINE_BOX * MM_PER_PT;
}

function text(
  x: number,
  y: number,
  w: number,
  value: string,
  sizePt: number,
  options: Partial<
    Pick<Extract<PaintCommand, { type: 'text' }>, 'align' | 'color' | 'rotateDeg' | 'opacity'>
  > & { readonly weight?: PdfFontWeight } = {},
): PaintCommand {
  return {
    type: 'text',
    x,
    y,
    w,
    text: value,
    sizePt,
    weight: options.weight ?? 'regular',
    align: options.align ?? 'left',
    color: options.color ?? 'ink',
    ...(options.rotateDeg !== undefined ? { rotateDeg: options.rotateDeg } : {}),
    ...(options.opacity !== undefined ? { opacity: options.opacity } : {}),
  };
}

function rule(
  x1: number,
  x2: number,
  y: number,
  widthMm: number,
  color: 'line' | 'lineStrong',
  dotted = false,
): PaintCommand {
  return { type: 'line', x1, y1: y, x2, y2: y, widthMm, color, ...(dotted ? { dotted } : {}) };
}

/** Greedy word wrap; a word wider than the line is broken by characters. */
export function wrapText(
  value: string,
  maxWidthMm: number,
  sizePt: number,
  weight: PdfFontWeight,
  measure: TextMeasure,
): string[] {
  const lines: string[] = [];
  let current = '';

  const push = (word: string) => {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate, sizePt, weight) <= maxWidthMm) {
      current = candidate;
      return;
    }
    if (current) {
      lines.push(current);
      current = '';
    }
    if (measure(word, sizePt, weight) <= maxWidthMm) {
      current = word;
      return;
    }
    let piece = '';
    for (const char of word) {
      if (piece && measure(piece + char, sizePt, weight) > maxWidthMm) {
        lines.push(piece);
        piece = '';
      }
      piece += char;
    }
    current = piece;
  };

  for (const word of value.split(/\s+/).filter(Boolean)) push(word);
  if (current) lines.push(current);
  return lines;
}

/** Cuts text to one line that fits, with an ellipsis. */
export function fitLine(
  value: string,
  maxWidthMm: number,
  sizePt: number,
  weight: PdfFontWeight,
  measure: TextMeasure,
): string {
  if (measure(value, sizePt, weight) <= maxWidthMm) return value;
  const chars = [...value];
  while (chars.length > 0 && measure(`${chars.join('')}…`, sizePt, weight) > maxWidthMm) {
    chars.pop();
  }
  return chars.length > 0 ? `${chars.join('').trimEnd()}…` : '';
}

interface Painted {
  readonly commands: PaintCommand[];
  readonly heightMm: number;
}

/** The write-in fields (name, class and number, score), drawn as a label and a dotted line. */
function paintStudentRow(
  fields: readonly string[],
  x: number,
  y: number,
  w: number,
  withTopRule: boolean,
  measure: TextMeasure,
): Painted {
  if (fields.length === 0) return { commands: [], heightMm: 0 };

  const commands: PaintCommand[] = [];
  const sizePt = 8.5;
  const gap = 6;
  let top = y;

  if (withTopRule) {
    commands.push(rule(x, x + w, y, RULE_MM, 'line'));
    top += 3;
  }

  const labels = fields.map((field) => `${field}:`);
  const weights = fields.map((_, index) => (index === 0 ? 2.2 : 1.2));
  const free = w - gap * (fields.length - 1);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const box = lineBoxMm(sizePt);

  let cursor = x;
  labels.forEach((label, index) => {
    const width = (free * (weights[index] as number)) / totalWeight;
    const labelWidth = measure(label, sizePt, 'semibold');
    commands.push(
      text(cursor, top, labelWidth + 1, label, sizePt, { weight: 'semibold', color: 'ink2' }),
    );
    commands.push(
      rule(
        cursor + labelWidth + 1.5,
        cursor + width,
        top + box * 0.95,
        RULE_MM,
        'lineStrong',
        true,
      ),
    );
    cursor += width + gap;
  });

  return { commands, heightMm: top - y + box + 1 };
}

function paintBookletCode(header: LayoutHeader, x: number, y: number, w: number): PaintCommand[] {
  if (!header.bookletCode) return [];
  const size = 11;
  return [
    {
      type: 'rect',
      x: x + w - size,
      y,
      w: size,
      h: size,
      strokeMm: 0.4,
      stroke: 'ink',
      fill: null,
    },
    text(x + w - size, y + (size - lineBoxMm(18)) / 2, size, header.bookletCode, 18, {
      weight: 'semibold',
      align: 'center',
    }),
  ];
}

/** Details such as the teacher and duration, side by side with a fixed gap. */
function paintDetailRow(
  details: readonly string[],
  y: number,
  x: number,
  w: number,
  align: 'center' | 'left',
  measure: TextMeasure,
): Painted {
  if (details.length === 0) return { commands: [], heightMm: 0 };
  const sizePt = 8.5;
  const gap = 8;
  const widths = details.map((detail) => measure(detail, sizePt));
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (details.length - 1);
  let cursor = align === 'center' ? x + (w - total) / 2 : x;

  const commands = details.map((detail, index) => {
    const command = text(cursor, y, (widths[index] as number) + 1, detail, sizePt, {
      color: 'ink3',
    });
    cursor += (widths[index] as number) + gap;
    return command;
  });
  return { commands, heightMm: lineBoxMm(sizePt) };
}

/** The full header shown on page one. `y` is its top; the returned height includes the gap below. */
export function paintFirstHeader(
  header: LayoutHeader,
  x: number,
  y: number,
  w: number,
  measure: TextMeasure,
): Painted {
  const commands: PaintCommand[] = [];
  let cursor = y;
  const codeReserve = header.bookletCode ? 14 : 0;
  const innerW = w - codeReserve;

  const addWrapped = (
    value: string,
    sizePt: number,
    options: {
      weight: PdfFontWeight;
      align: 'left' | 'center';
      color: 'ink' | 'ink2' | 'ink3';
      maxLines: number;
    },
    area: { x: number; w: number },
  ) => {
    const lines = wrapText(value, area.w, sizePt, options.weight, measure).slice(
      0,
      options.maxLines,
    );
    for (const line of lines) {
      commands.push(text(area.x, cursor, area.w, line, sizePt, options));
      cursor += lineBoxMm(sizePt) * 1.05;
    }
  };

  if (header.preset === 'modern') {
    const leftW = innerW * 0.62;
    const detailX = x + leftW;
    const detailW = innerW - leftW;
    const top = cursor;
    if (header.schoolName) {
      addWrapped(
        header.schoolName,
        12,
        { weight: 'semibold', align: 'left', color: 'ink', maxLines: 2 },
        { x, w: leftW },
      );
    }
    if (header.metaLine) {
      cursor += 0.6;
      addWrapped(
        header.metaLine,
        8.5,
        { weight: 'medium', align: 'left', color: 'ink2', maxLines: 2 },
        { x, w: leftW },
      );
    }
    let detailY = top;
    for (const detail of header.detailLines) {
      commands.push(
        text(detailX, detailY, detailW, fitLine(detail, detailW, 8.5, 'regular', measure), 8.5, {
          align: 'right',
          color: 'ink3',
        }),
      );
      detailY += lineBoxMm(8.5);
    }
    cursor = Math.max(cursor, detailY);
  } else if (header.preset === 'classic') {
    const area = { x: x + 6, w: innerW - 12 };
    if (header.schoolName) {
      addWrapped(
        header.schoolName,
        14,
        { weight: 'semibold', align: 'center', color: 'ink', maxLines: 2 },
        area,
      );
    }
    if (header.metaLine) {
      cursor += 0.8;
      addWrapped(
        header.metaLine,
        9,
        { weight: 'medium', align: 'center', color: 'ink2', maxLines: 2 },
        area,
      );
    }
    const details = paintDetailRow(header.detailLines, cursor + 1, x, innerW, 'center', measure);
    commands.push(...details.commands);
    if (details.heightMm > 0) cursor += 1 + details.heightMm;
  }

  commands.push(...paintBookletCode(header, x, y, w));
  if (codeReserve > 0) cursor = Math.max(cursor, y + 11);

  if (header.studentFields.length > 0) {
    const gapAbove = header.preset === 'minimal' ? 0 : 1.5;
    const row = paintStudentRow(
      header.studentFields,
      x,
      cursor + gapAbove,
      w,
      header.preset !== 'minimal',
      measure,
    );
    commands.push(...row.commands);
    cursor += gapAbove + row.heightMm;
  }

  if (header.instructions) {
    cursor += 2.5;
    addWrapped(
      header.instructions,
      8,
      { weight: 'regular', align: 'center', color: 'ink3', maxLines: 3 },
      { x, w },
    );
  }

  cursor += 3;
  commands.push(rule(x, x + w, cursor, STRONG_RULE_MM, 'lineStrong'));
  cursor += HEADER_BODY_GAP_MM;

  return { commands, heightMm: cursor - y };
}

/** The slim header shown from page two on. */
export function paintCompactHeader(
  header: LayoutHeader,
  pageLabel: string,
  x: number,
  y: number,
  w: number,
  measure: TextMeasure,
): Painted {
  const sizePt = 8.5;
  const box = lineBoxMm(sizePt);
  const labelW = pageLabel ? measure(pageLabel, sizePt, 'medium') : 0;
  const schoolW = header.schoolName ? measure(header.schoolName, sizePt, 'semibold') : 0;
  const metaMax = Math.max(0, w - labelW - schoolW - 10);

  const commands: PaintCommand[] = [];
  if (header.schoolName) {
    commands.push(text(x, y, schoolW + 1, header.schoolName, sizePt, { weight: 'semibold' }));
  }
  const meta = fitLine(header.compactLine, metaMax, sizePt, 'regular', measure);
  if (meta) {
    commands.push(
      text(x + schoolW + (schoolW > 0 ? 4 : 0), y, metaMax, meta, sizePt, { color: 'ink2' }),
    );
  }
  if (pageLabel) {
    commands.push(
      text(x + w - labelW - 1, y, labelW + 1, pageLabel, sizePt, {
        weight: 'medium',
        align: 'right',
        color: 'ink2',
      }),
    );
  }

  const ruleY = y + box + 2.5;
  commands.push(rule(x, x + w, ruleY, RULE_MM, 'line'));
  return { commands, heightMm: ruleY - y + HEADER_BODY_GAP_MM };
}

function fillPageLabel(template: string, page: number, total: number): string {
  return template.replace('{page}', String(page)).replace('{total}', String(total));
}

/** The footer block; its top rule is at `y`. */
export function paintFooter(
  footer: LayoutFooter,
  pageNumber: number,
  totalPages: number,
  x: number,
  y: number,
  w: number,
  measure: TextMeasure,
): Painted {
  const sizePt = 7;
  const commands: PaintCommand[] = [rule(x, x + w, y, RULE_MM, 'line')];
  const top = y + 2.2;

  if (footer.brandingLine) {
    commands.push(
      text(
        x,
        top,
        w * 0.6,
        fitLine(footer.brandingLine, w * 0.6, sizePt, 'regular', measure),
        sizePt,
        { color: 'ink3' },
      ),
    );
  }
  const label = fillPageLabel(footer.pageLabel, pageNumber, totalPages);
  if (label) {
    commands.push(
      text(x + w * 0.6, top, w * 0.4, label, sizePt, { align: 'right', color: 'ink3' }),
    );
  }
  return { commands, heightMm: 2.2 + lineBoxMm(sizePt) };
}

const EMPTY_HEADER: LayoutHeader = {
  preset: 'minimal',
  schoolName: '',
  metaLine: '',
  detailLines: [],
  instructions: '',
  studentFields: [],
  compactLine: '',
  bookletCode: null,
};
const EMPTY_FOOTER: LayoutFooter = { brandingLine: '', pageLabel: '' };

export interface FrameMetrics {
  readonly headerHeightMm: number;
  readonly continuationHeaderHeightMm: number;
  readonly footerHeightMm: number;
}

/**
 * The header and footer heights for the layout engine. They come from drawing them for
 * real, so the space the engine reserves is exactly the space the header takes.
 */
export function frameMetrics(
  header: LayoutHeader | undefined,
  footer: LayoutFooter | undefined,
  contentWidthMm: number,
  measure: TextMeasure,
): FrameMetrics {
  const usedHeader = header ?? EMPTY_HEADER;
  const usedFooter = footer ?? EMPTY_FOOTER;
  const first = paintFirstHeader(usedHeader, 0, 0, contentWidthMm, measure);
  const compact = paintCompactHeader(
    usedHeader,
    usedFooter.pageLabel,
    0,
    0,
    contentWidthMm,
    measure,
  );
  const footerBlock = paintFooter(usedFooter, 1, 1, 0, 0, contentWidthMm, measure);
  return {
    headerHeightMm: first.heightMm,
    continuationHeaderHeightMm: compact.heightMm,
    footerHeightMm: FOOTER_GAP_MM + footerBlock.heightMm,
  };
}

/** Width available to a question's image inside its block, after the gutters. */
export function imageContentWidthMm(
  blockWidthMm: number,
  content: Pick<TestPaintContent, 'numberGutterMm' | 'pointsGutterMm'>,
  scale = 1,
): number {
  return blockWidthMm - (content.numberGutterMm + content.pointsGutterMm) * scale;
}

/** The height a question image takes in a column of this width; the engine's `measure` uses it. */
export function questionImageHeightMm(
  columnWidthMm: number,
  content: Pick<TestPaintContent, 'numberGutterMm' | 'pointsGutterMm'>,
  pixelWidth: number,
  pixelHeight: number,
): number {
  return (imageContentWidthMm(columnWidthMm, content) * pixelHeight) / pixelWidth;
}

function paintBlock(block: LayoutBlock, content: TestPaintContent): PaintCommand[] {
  const s = block.scale;

  if (block.kind === 'passage') {
    const key = `passage:${block.groupId ?? ''}`;
    return content.imageKeys.has(key)
      ? [{ type: 'image', x: block.x, y: block.y, w: block.w, h: block.h, key }]
      : [
          {
            type: 'rect',
            x: block.x,
            y: block.y,
            w: block.w,
            h: block.h,
            strokeMm: RULE_MM,
            stroke: 'lineStrong',
            fill: null,
          },
        ];
  }

  const itemId = block.itemId ?? '';
  const gutter = content.numberGutterMm * s;
  const pointsGutter = content.pointsGutterMm * s;
  const commands: PaintCommand[] = [];

  if (block.number !== null) {
    commands.push(
      text(block.x, block.y + 0.4 * s, gutter, `${block.number}.`, 10 * s, { weight: 'semibold' }),
    );
  }

  const imageX = block.x + gutter;
  const imageW = block.w - gutter - pointsGutter;
  commands.push(
    content.imageKeys.has(itemId)
      ? { type: 'image', x: imageX, y: block.y, w: imageW, h: block.h, key: itemId }
      : {
          type: 'rect',
          x: imageX,
          y: block.y,
          w: imageW,
          h: block.h,
          strokeMm: RULE_MM,
          stroke: 'lineStrong',
          fill: null,
        },
  );

  const points = content.pointsLabels.get(itemId);
  if (points && pointsGutter > 0) {
    commands.push(
      text(block.x + block.w - pointsGutter, block.y + 0.6 * s, pointsGutter, points, 8 * s, {
        align: 'right',
        color: 'ink3',
      }),
    );
  }
  return commands;
}

function paintWatermark(
  watermark: NonNullable<PaintDocument['watermark']>,
  widthMm: number,
  heightMm: number,
  measure: TextMeasure,
): PaintCommand[] {
  if (!watermark.text) return [];
  const sizePt = 28;
  const textWidth = measure(watermark.text, sizePt, 'semibold');
  const stepX = textWidth + 40;
  const stepY = 70;
  const commands: PaintCommand[] = [];

  for (let row = 0; row * stepY < heightMm + stepY; row += 1) {
    for (let column = -1; column * stepX < widthMm; column += 1) {
      const offset = row % 2 === 0 ? 0 : stepX / 2;
      commands.push(
        text(column * stepX + offset, row * stepY, textWidth + 1, watermark.text, sizePt, {
          weight: 'semibold',
          color: 'ink3',
          rotateDeg: watermark.angle,
          opacity: watermark.opacity,
        }),
      );
    }
  }
  return commands;
}

interface BodyArea {
  readonly top: number;
  readonly height: number;
}

function extraBody(doc: PaintDocument, compactHeight: number): BodyArea {
  const m = doc.metrics;
  const top = m.marginsMm.top + compactHeight;
  return { top, height: doc.heightMm - m.marginsMm.bottom - m.footerHeightMm - top };
}

const SHEET_ROW_MM = 7.5;
const SHEET_COLUMNS = 3;
const KEY_ROW_MM = 10;
const KEY_COLUMNS = 5;
const EXTRA_TITLE_MM = 14;

function extraPageCount(extra: PaintExtra, body: BodyArea): number {
  const usable = Math.max(1, body.height - EXTRA_TITLE_MM);
  if (extra.kind === 'answerSheet') {
    const perPage = Math.max(1, Math.floor(usable / SHEET_ROW_MM)) * SHEET_COLUMNS;
    return Math.max(1, Math.ceil(extra.count / perPage));
  }
  const perPage = Math.max(1, Math.floor(usable / KEY_ROW_MM)) * KEY_COLUMNS;
  return Math.max(1, Math.ceil(extra.answers.length / perPage));
}

function paintExtraBody(
  extra: PaintExtra,
  pageInExtra: number,
  doc: PaintDocument,
  body: BodyArea,
  measure: TextMeasure,
): PaintCommand[] {
  const m = doc.metrics;
  const x = m.marginsMm.left;
  const w = doc.widthMm - m.marginsMm.left - m.marginsMm.right;
  const commands: PaintCommand[] = [
    text(x, body.top, w, extra.title, 12, { weight: 'semibold', align: 'center' }),
  ];
  const usable = Math.max(1, body.height - EXTRA_TITLE_MM);
  const top = body.top + EXTRA_TITLE_MM;

  if (extra.kind === 'answerSheet') {
    const rows = Math.max(1, Math.floor(usable / SHEET_ROW_MM));
    const perPage = rows * SHEET_COLUMNS;
    const columnW = w / SHEET_COLUMNS;
    const start = pageInExtra * perPage;
    const box = 5;

    for (let index = start; index < Math.min(extra.count, start + perPage); index += 1) {
      const local = index - start;
      const column = Math.floor(local / rows);
      const row = local % rows;
      const cellX = x + column * columnW;
      const cellY = top + row * SHEET_ROW_MM;

      commands.push(
        text(cellX, cellY + 0.6, 8, `${index + 1}.`, 9, { weight: 'medium', align: 'right' }),
      );
      extra.optionLetters.forEach((letter, letterIndex) => {
        const boxX = cellX + 10 + letterIndex * (box + 1.4);
        commands.push({
          type: 'rect',
          x: boxX,
          y: cellY,
          w: box,
          h: box,
          strokeMm: 0.25,
          stroke: 'lineStrong',
          fill: null,
        });
        commands.push(
          text(boxX, cellY + (box - lineBoxMm(7)) / 2, box, letter, 7, {
            weight: 'semibold',
            align: 'center',
            color: 'ink2',
          }),
        );
      });
    }
    void measure;
    return commands;
  }

  const rows = Math.max(1, Math.floor(usable / KEY_ROW_MM));
  const perPage = rows * KEY_COLUMNS;
  const cellW = (w - 2 * (KEY_COLUMNS - 1)) / KEY_COLUMNS;
  const start = pageInExtra * perPage;

  for (let index = start; index < Math.min(extra.answers.length, start + perPage); index += 1) {
    const local = index - start;
    const row = Math.floor(local / KEY_COLUMNS);
    const column = local % KEY_COLUMNS;
    const cellX = x + column * (cellW + 2);
    const cellY = top + row * KEY_ROW_MM;
    commands.push({
      type: 'rect',
      x: cellX,
      y: cellY,
      w: cellW,
      h: 8,
      strokeMm: RULE_MM,
      stroke: 'line',
      fill: null,
    });
    commands.push(
      text(cellX + 2.5, cellY + (8 - lineBoxMm(9)) / 2, cellW / 2, `${index + 1}.`, 9, {
        color: 'ink2',
      }),
    );
    commands.push(
      text(
        cellX + cellW / 2,
        cellY + (8 - lineBoxMm(10)) / 2,
        cellW / 2 - 2.5,
        extra.answers[index] as string,
        10,
        { weight: 'semibold', align: 'right' },
      ),
    );
  }
  return commands;
}

/**
 * Turns a `LayoutDocument` plus its content into the primitives of every page: the
 * questions the engine placed, the header and footer, column dividers, a watermark, and
 * any answer sheet or answer key pages after them.
 */
export function paintTest(doc: PaintDocument, content: TestPaintContent): PaintPage[] {
  const m: LayoutMetrics = doc.metrics;
  const measure = content.measure;
  const x = m.marginsMm.left;
  const w = doc.widthMm - m.marginsMm.left - m.marginsMm.right;
  const header = doc.header ?? EMPTY_HEADER;
  const footer = doc.footer ?? EMPTY_FOOTER;

  const compactProbe = paintCompactHeader(header, footer.pageLabel, x, 0, w, measure);
  const extraCounts = content.extras.map((extra) =>
    extraPageCount(extra, extraBody(doc, compactProbe.heightMm)),
  );
  const total = doc.pages.length + extraCounts.reduce((sum, count) => sum + count, 0);

  const frame = (pageNumber: number, first: boolean): PaintCommand[] => {
    const commands: PaintCommand[] = [];
    if (first) {
      commands.push(...paintFirstHeader(header, x, m.marginsMm.top, w, measure).commands);
    } else {
      commands.push(
        ...paintCompactHeader(
          header,
          fillPageLabel(footer.pageLabel, pageNumber, total),
          x,
          m.marginsMm.top,
          w,
          measure,
        ).commands,
      );
    }
    const footerY = doc.heightMm - m.marginsMm.bottom - m.footerHeightMm + FOOTER_GAP_MM;
    commands.push(...paintFooter(footer, pageNumber, total, x, footerY, w, measure).commands);
    return commands;
  };

  const pages: PaintPage[] = [];

  doc.pages.forEach((page, pageIndex) => {
    const commands: PaintCommand[] = [];
    if (doc.watermark)
      commands.push(...paintWatermark(doc.watermark, doc.widthMm, doc.heightMm, measure));
    commands.push(...frame(pageIndex + 1, pageIndex === 0));

    if (content.showColumnDivider && m.columns > 1) {
      const bodyTop =
        m.marginsMm.top + (pageIndex === 0 ? m.headerHeightMm : m.continuationHeaderHeightMm);
      const bodyBottom = doc.heightMm - m.marginsMm.bottom - m.footerHeightMm;
      const columnW = (w - m.columnGapMm * (m.columns - 1)) / m.columns;
      const occupied = page.columns.filter((column) => column.blocks.length > 0).length;
      for (
        let column = 0;
        column < Math.min(m.columns - 1, Math.max(0, occupied - 1));
        column += 1
      ) {
        const dividerX = x + (column + 1) * columnW + column * m.columnGapMm + m.columnGapMm / 2;
        commands.push({
          type: 'line',
          x1: dividerX,
          y1: bodyTop,
          x2: dividerX,
          y2: bodyBottom,
          widthMm: RULE_MM,
          color: 'line',
        });
      }
    }

    for (const column of page.columns) {
      for (const block of column.blocks) commands.push(...paintBlock(block, content));
    }

    pages.push({ widthMm: doc.widthMm, heightMm: doc.heightMm, commands });
  });

  const body = extraBody(doc, compactProbe.heightMm);
  content.extras.forEach((extra, extraIndex) => {
    for (let pageInExtra = 0; pageInExtra < (extraCounts[extraIndex] as number); pageInExtra += 1) {
      const commands: PaintCommand[] = [];
      if (doc.watermark)
        commands.push(...paintWatermark(doc.watermark, doc.widthMm, doc.heightMm, measure));
      commands.push(...frame(pages.length + 1, false));
      commands.push(...paintExtraBody(extra, pageInExtra, doc, body, measure));
      pages.push({ widthMm: doc.widthMm, heightMm: doc.heightMm, commands });
    }
  });

  return pages;
}
