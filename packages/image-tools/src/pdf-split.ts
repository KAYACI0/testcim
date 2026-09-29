import type { PdfTextItem } from './pdf-text';
import type { PixelBox } from './raw-image';

/** `^12.` / `^12)` at the start of a line, own item or merged with the question text. */
const ISOLATED_NUMBER_RE = /^(\d{1,3})[.)]\s*$/;
const MERGED_NUMBER_RE = /^(\d{1,3})[.)]\s+\S/;

/** One "sayfayı otomatik böl" suggestion (docs/adr/0003 §2), in PDF points. */
export interface CropBoxSuggestion {
  readonly number: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly confidence: number;
  /** The number token's own bounding box, for masking (docs/adr/0003 §3). */
  readonly numberBox: PixelBox;
}

export interface SplitTextLayerOptions {
  /** Line clustering tolerance in points. */
  readonly lineTolerance?: number;
  /** Minimum gap (as a fraction of page width) that separates two columns. */
  readonly columnGapFraction?: number;
  /** How close (as a fraction of column width) a number token must be to the column's left edge. */
  readonly numberIndentFraction?: number;
  /** Padding kept above/below a block's anchor, in points. */
  readonly padding?: number;
}

interface Line {
  readonly items: PdfTextItem[];
  readonly yTop: number;
  readonly minX: number;
}

function groupLines(items: readonly PdfTextItem[], tolerance: number): Line[] {
  const sorted = [...items].sort((a, b) => a.yTop - b.yTop || a.x - b.x);
  const lines: Line[] = [];

  for (const item of sorted) {
    const last = lines.at(-1);
    if (last && Math.abs(item.yTop - last.yTop) <= tolerance) {
      last.items.push(item);
      last.items.sort((a, b) => a.x - b.x);
    } else {
      lines.push({ items: [item], yTop: item.yTop, minX: item.x });
    }
  }

  for (const line of lines) {
    (line as { minX: number }).minX = Math.min(...line.items.map((i) => i.x));
  }

  return lines;
}

interface ColumnRange {
  /** Assignment boundary (extends to the gap midpoint, or full width for a single column). */
  readonly left: number;
  readonly right: number;
  /** Actual content extent (the run's own bounds), used for the number-indent check. */
  readonly contentLeft: number;
  readonly contentRight: number;
}

/** Buckets item x-extents at `bucketWidth`pt resolution and finds up to two columns. */
function detectColumns(
  items: readonly PdfTextItem[],
  pageWidth: number,
  gapFraction: number,
): ColumnRange[] {
  if (items.length === 0) {
    return [{ left: 0, right: pageWidth, contentLeft: 0, contentRight: pageWidth }];
  }

  const bucketWidth = 10;
  const bucketCount = Math.max(1, Math.ceil(pageWidth / bucketWidth));
  const covered = new Array<boolean>(bucketCount).fill(false);

  for (const item of items) {
    const start = Math.max(0, Math.floor(item.x / bucketWidth));
    const end = Math.min(bucketCount - 1, Math.floor((item.x + item.width) / bucketWidth));
    for (let b = start; b <= end; b += 1) {
      covered[b] = true;
    }
  }

  const runs: { start: number; end: number }[] = [];
  let runStart: number | null = null;
  for (let b = 0; b < bucketCount; b += 1) {
    if (covered[b] && runStart === null) {
      runStart = b;
    } else if (!covered[b] && runStart !== null) {
      runs.push({ start: runStart, end: b - 1 });
      runStart = null;
    }
  }
  if (runStart !== null) {
    runs.push({ start: runStart, end: bucketCount - 1 });
  }

  if (runs.length < 2) {
    const minX = Math.min(...items.map((i) => i.x));
    const maxX = Math.max(...items.map((i) => i.x + i.width));
    return [{ left: minX, right: maxX, contentLeft: minX, contentRight: maxX }];
  }

  // Largest gap (in points) between consecutive runs.
  let bestGapIndex = -1;
  let bestGapPt = 0;
  for (let i = 0; i < runs.length - 1; i += 1) {
    const gapPt = (runs[i + 1]!.start - runs[i]!.end - 1) * bucketWidth;
    if (gapPt > bestGapPt) {
      bestGapPt = gapPt;
      bestGapIndex = i;
    }
  }

  if (bestGapIndex === -1 || bestGapPt < gapFraction * pageWidth) {
    const minX = Math.min(...items.map((i) => i.x));
    const maxX = Math.max(...items.map((i) => i.x + i.width));
    return [{ left: minX, right: maxX, contentLeft: minX, contentRight: maxX }];
  }

  const leftEnd = runs[bestGapIndex]!.end * bucketWidth + bucketWidth;
  const rightStart = runs[bestGapIndex + 1]!.start * bucketWidth;
  const boundary = (leftEnd + rightStart) / 2;
  const overallMinX = runs[0]!.start * bucketWidth;
  const overallMaxX = runs.at(-1)!.end * bucketWidth + bucketWidth;

  return [
    { left: overallMinX, right: boundary, contentLeft: overallMinX, contentRight: leftEnd },
    { left: boundary, right: overallMaxX, contentLeft: rightStart, contentRight: overallMaxX },
  ];
}

function columnOf(x: number, columns: readonly ColumnRange[]): number {
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < columns.length; i += 1) {
    const col = columns[i]!;
    const dist = x < col.left ? col.left - x : x > col.right ? x - col.right : 0;
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

interface Candidate {
  readonly number: number;
  readonly columnIndex: number;
  readonly line: Line;
  readonly numberBox: PixelBox;
}

function matchNumber(line: Line): { number: number; numberBox: PixelBox } | null {
  const first = line.items[0];
  if (!first) {
    return null;
  }

  const isolated = ISOLATED_NUMBER_RE.exec(first.str.trim());
  if (isolated) {
    return {
      number: Number.parseInt(isolated[1]!, 10),
      numberBox: { x: first.x, y: first.yTop, width: first.width, height: first.height },
    };
  }

  const merged = MERGED_NUMBER_RE.exec(first.str);
  if (merged) {
    const prefixLen = merged[0].length;
    const fraction = first.str.length === 0 ? 0 : prefixLen / first.str.length;
    return {
      number: Number.parseInt(merged[1]!, 10),
      numberBox: {
        x: first.x,
        y: first.yTop,
        width: first.width * fraction,
        height: first.height,
      },
    };
  }

  return null;
}

/**
 * Suggests question-block crop boxes from a page's text layer
 * (docs/adr/0003 §2). Pure and synchronous — no pdf.js, no DOM, no I/O.
 */
export function splitTextLayer(
  rawItems: readonly PdfTextItem[],
  pageWidth: number,
  pageHeight: number,
  options: SplitTextLayerOptions = {},
): CropBoxSuggestion[] {
  // pdf.js sometimes emits a synthetic whitespace-only item to represent a
  // large gap between two text runs (e.g. between a right-column number and
  // the end of the preceding left-column line); its width can span the
  // entire inter-column gutter and would otherwise defeat column detection.
  // It carries no content, so it is dropped before any analysis.
  const items = rawItems.filter((item) => item.str.trim().length > 0);
  if (items.length === 0) {
    return [];
  }

  const lineTolerance = options.lineTolerance ?? 2;
  const columnGapFraction = options.columnGapFraction ?? 0.05;
  const numberIndentFraction = options.numberIndentFraction ?? 0.15;
  const padding = options.padding ?? 6;

  const columns = detectColumns(items, pageWidth, columnGapFraction);

  // Lines are grouped per column, not globally: in a two-column layout, rows
  // in the left and right column commonly share the same yTop, and a
  // page-wide line clustering would merge them into one line, hiding the
  // right column's number token behind the left column's (see docs/adr/0003
  // §2 step 2 — column assignment happens before line clustering).
  const candidates: Candidate[] = [];
  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const column = columns[columnIndex]!;
    const columnItems = items.filter((item) => columnOf(item.x, columns) === columnIndex);
    const columnWidth = Math.max(1, column.contentRight - column.contentLeft);

    for (const line of groupLines(columnItems, lineTolerance)) {
      const match = matchNumber(line);
      if (!match) {
        continue;
      }
      if (Math.abs(line.minX - column.contentLeft) > numberIndentFraction * columnWidth) {
        continue;
      }
      candidates.push({ number: match.number, columnIndex, line, numberBox: match.numberBox });
    }
  }

  const suggestions: CropBoxSuggestion[] = [];

  for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
    const column = columns[columnIndex]!;
    const columnCandidates = candidates
      .filter((c) => c.columnIndex === columnIndex)
      .sort((a, b) => a.line.yTop - b.line.yTop);

    let expected = columnCandidates[0]?.number ?? 0;

    for (let i = 0; i < columnCandidates.length; i += 1) {
      const candidate = columnCandidates[i]!;
      const next = columnCandidates[i + 1];
      const top = Math.max(0, candidate.line.yTop - padding);
      const bottom = next ? Math.max(top, next.line.yTop - padding) : pageHeight;

      const itemsInBlock = items.filter(
        (item) =>
          item.yTop >= candidate.line.yTop - lineTolerance &&
          item.yTop < bottom &&
          columnOf(item.x, columns) === columnIndex,
      );
      const left =
        itemsInBlock.length > 0 ? Math.min(...itemsInBlock.map((i) => i.x)) : column.contentLeft;
      const right =
        itemsInBlock.length > 0
          ? Math.max(...itemsInBlock.map((i) => i.x + i.width))
          : column.contentRight;

      const confidence = candidate.number === expected ? 1 : 0.5;
      expected = candidate.number + 1;

      suggestions.push({
        number: candidate.number,
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
        confidence,
        numberBox: candidate.numberBox,
      });
    }
  }

  return suggestions.sort((a, b) => a.number - b.number);
}
