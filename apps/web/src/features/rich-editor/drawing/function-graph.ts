/**
 * Renders `y = f(x)` to a PNG data URL using an offscreen JSXGraph board
 * (docs/prompts/07 — plan's "hybrid" decision: JSXGraph is used only as a
 * math-plotting engine, never shown to the user as itself — its own
 * interaction chrome/theme never reaches the UI). The result is rasterized
 * once and stored as a locked `function-graph` scene object's `imageDataUrl`;
 * editing the function reopens this and replaces the image.
 */
export async function renderFunctionGraph(options: {
  readonly expression: string;
  readonly xMin: number;
  readonly xMax: number;
  readonly width: number;
  readonly height: number;
}): Promise<string> {
  const { expression, xMin, xMax, width, height } = options;
  const JXG = (await import('jsxgraph')).default;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  document.body.appendChild(container);

  try {
    const yPad = (xMax - xMin) / 2;
    const board = JXG.JSXGraph.initBoard(container, {
      boundingbox: [xMin, yPad, xMax, -yPad],
      axis: true,
      grid: true,
      showCopyright: false,
      showNavigation: false,
      keepAspectRatio: false,
    });

    // `expression` becomes a JS function body via JSXGraph's own expression
    // parser (Math.* is in scope), never `eval`'d directly by Testcim code.
    board.create('functiongraph', [board.jc.snippet(expression, true, 'x', false)]);
    board.update();

    const svg = board.containerObj.querySelector('svg');
    if (!svg) {
      throw new Error('jsxgraph_render_failed');
    }

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;

    return await new Promise<string>((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas_context_unavailable'));
          return;
        }
        ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      image.onerror = () => reject(new Error('jsxgraph_image_load_failed'));
      image.src = svgUrl;
    });
  } finally {
    document.body.removeChild(container);
  }
}
