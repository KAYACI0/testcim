/**
 * Plain, DOM/pdf.js-free representation of one `getTextContent()` item,
 * already converted to a top-left-origin coordinate system (docs/adr/0003
 * §2 step 1): `yTop` is the top of the item's bounding box, `x` its left
 * edge, both in PDF points. The conversion from pdf.js's bottom-left-origin
 * `transform` matrix happens once, in the worker that calls pdf.js
 * (`apps/web/src/features/crop/worker/pdf-render.worker.ts`) — this package
 * never imports pdf.js itself (repo rule: no heavy/DOM deps in `packages/*`).
 *
 * Conversion used by the caller: `yTop = pageHeight - transform[5] - height`
 * (baseline-from-top minus the item's own height; an approximation that
 * ignores descender/ascender split, good enough for line clustering and
 * block bounds — not for typography).
 */
export interface PdfTextItem {
  readonly str: string;
  readonly x: number;
  readonly yTop: number;
  readonly width: number;
  readonly height: number;
}
