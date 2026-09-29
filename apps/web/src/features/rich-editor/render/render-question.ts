const MM_PER_INCH = 25.4;

/** Converts a millimeter length to pixels at the given DPI (rounded up so content never clips). */
export function mmToPx(mm: number, dpi: number): number {
  return Math.ceil((mm * dpi) / MM_PER_INCH);
}

function inlineStylesheets(): string {
  return Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join('\n');
      } catch {
        // Cross-origin stylesheet (e.g. a font CDN): its rules aren't
        // readable from script, but @font-face rules for Google Fonts-style
        // hosts still apply visually — nothing to inline for those anyway.
        return '';
      }
    })
    .join('\n');
}

export interface RenderQuestionOptions {
  /** Target width in millimeters (typically the test's column width). */
  readonly widthMm: number;
  /** docs/02 §5.2: Taslak 120, Standart 200, Yüksek 300. */
  readonly dpi: number;
}

/**
 * Flattens a rendered question/group-passage DOM node to a high-DPI PNG
 * (docs/02 §5.2 — rich questions enter the layout engine as one raster
 * image, same as a pasted screenshot). Uses the `foreignObject`-in-SVG
 * technique rather than adding an html2canvas-style dependency: the live
 * element is cloned, its page stylesheets are inlined into the SVG wrapper,
 * and the whole thing is drawn onto a canvas at the target pixel size.
 *
 * Known limitation (docs/backlog.md): cross-origin stylesheets' rules can't
 * be read from script and are silently skipped — irrelevant today since
 * every style Testcim ships is same-origin, but worth remembering if a
 * future dependency injects a `<link>` to an external CSS host.
 */
export async function renderElementToPng(
  element: HTMLElement,
  options: RenderQuestionOptions,
): Promise<Blob> {
  const widthPx = mmToPx(options.widthMm, options.dpi);
  const scale = widthPx / element.offsetWidth;
  const heightPx = Math.ceil(element.offsetHeight * scale);

  const clone = element.cloneNode(true) as HTMLElement;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svg.setAttribute('width', String(element.offsetWidth));
  svg.setAttribute('height', String(element.offsetHeight));

  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = inlineStylesheets();

  const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
  foreignObject.setAttribute('width', '100%');
  foreignObject.setAttribute('height', '100%');
  foreignObject.appendChild(clone);

  svg.appendChild(style);
  svg.appendChild(foreignObject);

  const svgData = new XMLSerializer().serializeToString(svg);
  const svgUrl = `data:image/svg+xml;charset=utf-8;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('render_image_load_failed'));
    img.src = svgUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = widthPx;
  canvas.height = heightPx;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('canvas_context_unavailable');
  }
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, widthPx, heightPx);
  ctx.drawImage(image, 0, 0, widthPx, heightPx);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas_to_blob_failed'));
    }, 'image/png');
  });
}
