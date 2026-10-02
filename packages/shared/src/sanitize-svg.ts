/**
 * Strict SVG sanitizer for user-provided drawings and rich-text nodes.
 *
 * Strips script execution vectors (Stored XSS):
 * - `<script>`, `<foreignObject>`, `<style>`, `<animate>`, `<set>`, `<iframe>`, `<object>`
 * - Event handlers (`onload`, `onerror`, `onclick`, etc.)
 * - `javascript:`, `vbscript:`, `data:text/html` URLs
 * - Arbitrary external resource loading via `href` / `xlink:href`
 */

const DANGEROUS_BLOCK_TAGS = [
  'script',
  'style',
  'foreignobject',
  'animate',
  'animatemotion',
  'animatetransform',
  'set',
  'handler',
  'iframe',
  'object',
  'embed',
  'audio',
  'video',
  'use',
  'meta',
  'link',
  'a',
];

const ALLOWED_TAGS = new Set([
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'image',
  'defs',
  'marker',
]);

const ALLOWED_ATTRS = new Set([
  'xmlns',
  'viewbox',
  'width',
  'height',
  'x',
  'y',
  'x1',
  'y1',
  'x2',
  'y2',
  'cx',
  'cy',
  'r',
  'rx',
  'ry',
  'points',
  'd',
  'dx',
  'dy',
  'transform',
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-opacity',
  'opacity',
  'font-size',
  'font-family',
  'font-weight',
  'font-style',
  'text-anchor',
  'dominant-baseline',
  'id',
  'class',
  'marker-start',
  'marker-mid',
  'marker-end',
  'refx',
  'refy',
  'markerwidth',
  'markerheight',
  'orient',
]);

const SAFE_IMAGE_DATA_URL_PATTERN = /^data:image\/(?:png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/;

function sanitizeAttributes(tagName: string, rawAttrs: string): string {
  const result: string[] = [];
  // Match attribute="value", attribute='value', or attribute=value
  const attrRegex = /([a-zA-Z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match: RegExpExecArray | null;

  while ((match = attrRegex.exec(rawAttrs)) !== null) {
    const rawName = match[1];
    if (!rawName) {
      continue;
    }
    const attrName = rawName.toLowerCase();
    const rawVal = match[2] ?? match[3] ?? match[4] ?? '';

    // Never allow event handlers (on*)
    if (attrName.startsWith('on')) {
      continue;
    }

    // Special check for image href / xlink:href
    if (tagName === 'image' && (attrName === 'href' || attrName === 'xlink:href')) {
      const trimmed = rawVal.trim();
      if (SAFE_IMAGE_DATA_URL_PATTERN.test(trimmed)) {
        result.push(`href="${trimmed}"`);
      }
      continue;
    }

    // Check against allowed attributes
    if (!ALLOWED_ATTRS.has(attrName)) {
      continue;
    }

    // If xmlns, verify it's the official svg or xlink namespace
    if (attrName === 'xmlns') {
      if (rawVal === 'http://www.w3.org/2000/svg') {
        result.push('xmlns="http://www.w3.org/2000/svg"');
      }
      continue;
    }

    // Strip any value containing javascript:, vbscript:, or data:
    let normalizedVal = '';
    for (let i = 0; i < rawVal.length; i++) {
      const code = rawVal.charCodeAt(i);
      if (code > 32 && code !== 127) {
        normalizedVal += rawVal[i];
      }
    }
    normalizedVal = normalizedVal.toLowerCase();
    if (
      normalizedVal.includes('javascript:') ||
      normalizedVal.includes('vbscript:') ||
      normalizedVal.includes('data:')
    ) {
      continue;
    }

    // Escape quotes and write clean attribute
    const escapedVal = rawVal.replace(/"/g, '&quot;');
    result.push(`${attrName}="${escapedVal}"`);
  }

  return result.length > 0 ? ' ' + result.join(' ') : '';
}

/**
 * Strips all script tags, foreignObject, event handlers, and unauthorized tags/attributes
 * from an SVG string, leaving only valid and safe vector elements.
 */
export function sanitizeSvg(svg: string): string {
  if (typeof svg !== 'string' || !svg.trim()) {
    return '';
  }

  let cleaned = svg;

  // 1. Remove dangerous block elements including their contents
  for (const tag of DANGEROUS_BLOCK_TAGS) {
    const blockRegex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    cleaned = cleaned.replace(blockRegex, '');
    const selfClosingRegex = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
    cleaned = cleaned.replace(selfClosingRegex, '');
  }

  // 2. Parse and filter remaining tags
  const tagRegex = /<\/?([a-zA-Z0-9_:-]+)([^>]*?)(\/?)>/g;
  cleaned = cleaned.replace(
    tagRegex,
    (_full, rawTag: string, rawAttrs: string, selfClosing: string) => {
      const tagName = rawTag.toLowerCase();
      const isClosing = _full.startsWith('</');

      if (!ALLOWED_TAGS.has(tagName)) {
        return '';
      }

      if (isClosing) {
        return `</${tagName}>`;
      }

      const safeAttrs = sanitizeAttributes(tagName, rawAttrs);
      const end =
        selfClosing ||
        tagName === 'image' ||
        tagName === 'line' ||
        tagName === 'circle' ||
        tagName === 'rect' ||
        tagName === 'path' ||
        tagName === 'polyline' ||
        tagName === 'polygon'
          ? ' />'
          : '>';
      return `<${tagName}${safeAttrs}${end === ' />' && !safeAttrs.endsWith('/') ? ' />' : end === ' />' ? '/>' : '>'}`;
    },
  );

  // Ensure it starts with <svg and ends with </svg>
  const svgStart = cleaned.indexOf('<svg');
  const svgEnd = cleaned.lastIndexOf('</svg>');
  if (svgStart === -1 || svgEnd === -1 || svgEnd <= svgStart) {
    return '';
  }

  return cleaned.substring(svgStart, svgEnd + 6).trim();
}
