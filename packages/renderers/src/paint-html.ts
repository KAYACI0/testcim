import { PAINT_CSS_VAR } from './paint-colors';

import type { PaintCommand, PaintPage } from './paint-types';

const ASCENT = 1.025;
const MM_PER_PT = 25.4 / 72;

const WEIGHT_CSS = { regular: 400, medium: 500, semibold: 600 } as const;

export interface RenderPaintHtmlOptions {
  /** The URL for an image key, or null to leave the space empty. */
  readonly imageSrc: (key: string) => string | null;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Only http(s), blob and inline raster images may become an `src`; nothing executable. */
const SAFE_SRC = /^(https?:\/\/|blob:|data:image\/(png|jpeg|webp);base64,)/i;

function n(value: number): string {
  return String(Number(value.toFixed(3)));
}

function box(x: number, y: number, w: number, h: number): string {
  return `position:absolute;left:${n(x)}mm;top:${n(y)}mm;width:${n(w)}mm;height:${n(h)}mm;`;
}

function renderCommand(command: PaintCommand, options: RenderPaintHtmlOptions): string {
  switch (command.type) {
    case 'text': {
      const ascentMm = ASCENT * command.sizePt * MM_PER_PT;
      const style = [
        `position:absolute;left:${n(command.x)}mm;top:${n(command.y)}mm;width:${n(command.w)}mm;`,
        `font-size:${n(command.sizePt)}pt;line-height:1.3;white-space:nowrap;`,
        `text-align:${command.align};font-weight:${WEIGHT_CSS[command.weight]};`,
        `color:${PAINT_CSS_VAR[command.color]};`,
        command.rotateDeg
          ? `transform:rotate(${n(-command.rotateDeg)}deg);transform-origin:0 ${n(ascentMm)}mm;`
          : '',
        command.opacity !== undefined ? `opacity:${n(command.opacity)};` : '',
        'pointer-events:none;',
      ].join('');
      return `<div style="${style}">${escapeHtml(command.text)}</div>`;
    }
    case 'line': {
      const css = PAINT_CSS_VAR[command.color];
      const kind = command.dotted ? 'dotted' : 'solid';
      if (command.y1 === command.y2) {
        const top = command.y1 - command.widthMm / 2;
        return `<div style="position:absolute;left:${n(Math.min(command.x1, command.x2))}mm;top:${n(top)}mm;width:${n(Math.abs(command.x2 - command.x1))}mm;border-top:${n(command.widthMm)}mm ${kind} ${css};pointer-events:none;"></div>`;
      }
      if (command.x1 === command.x2) {
        const left = command.x1 - command.widthMm / 2;
        return `<div style="position:absolute;left:${n(left)}mm;top:${n(Math.min(command.y1, command.y2))}mm;height:${n(Math.abs(command.y2 - command.y1))}mm;border-left:${n(command.widthMm)}mm ${kind} ${css};pointer-events:none;"></div>`;
      }
      throw new RangeError('Only horizontal and vertical lines are supported.');
    }
    case 'rect': {
      const border = command.stroke
        ? `border:${n(command.strokeMm)}mm solid ${PAINT_CSS_VAR[command.stroke]};`
        : '';
      const fill = command.fill ? `background:${PAINT_CSS_VAR[command.fill]};` : '';
      return `<div style="${box(command.x, command.y, command.w, command.h)}box-sizing:border-box;${border}${fill}pointer-events:none;"></div>`;
    }
    case 'image': {
      const src = options.imageSrc(command.key);
      if (!src || !SAFE_SRC.test(src)) return '';
      return `<img src="${escapeHtml(src)}" alt="" draggable="false" data-paint-key="${escapeHtml(command.key)}" style="${box(command.x, command.y, command.w, command.h)}object-fit:contain;object-position:left top;user-select:none;">`;
    }
  }
}

/**
 * One HTML string per page, every element absolutely positioned in millimetres. All
 * text is escaped and image addresses are checked against an allowlist, so the result
 * is safe to mount with `innerHTML` even though headers and instructions are free text.
 */
export function renderPaintHtml(
  pages: readonly PaintPage[],
  options: RenderPaintHtmlOptions,
): string[] {
  return pages.map((page) => {
    const body = page.commands.map((command) => renderCommand(command, options)).join('');
    return `<section data-paper-sheet="" style="position:relative;overflow:hidden;flex-shrink:0;width:${n(page.widthMm)}mm;height:${n(page.heightMm)}mm;background:${PAINT_CSS_VAR.surface};font-family:var(--font-sans);">${body}</section>`;
  });
}
