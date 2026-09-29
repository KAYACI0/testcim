import { describe, expect, it } from 'vitest';

import { EMPTY_SCENE, sceneToSvg } from './serialize';

import type { Scene } from './serialize';

describe('sceneToSvg', () => {
  it('renders an empty scene as an empty SVG with the right viewBox', () => {
    const svg = sceneToSvg(EMPTY_SCENE);
    expect(svg).toContain(`viewBox="0 0 ${EMPTY_SCENE.width} ${EMPTY_SCENE.height}"`);
    expect(svg).toContain('<svg');
  });

  it('renders a line and a point-label', () => {
    const scene: Scene = {
      ...EMPTY_SCENE,
      objects: [
        { id: 'o1', tool: 'line', points: [0, 0, 100, 50] },
        { id: 'o2', tool: 'point-label', x: 10, y: 10, label: 'A' },
      ],
    };
    const svg = sceneToSvg(scene);
    expect(svg).toContain('<line x1="0" y1="0" x2="100" y2="50"');
    expect(svg).toContain('>A<');
  });

  it('escapes Turkish text and XML-special characters', () => {
    const scene: Scene = {
      ...EMPTY_SCENE,
      objects: [{ id: 'o1', tool: 'text', x: 0, y: 0, text: 'İşaretli <köşe> & "tırnak"' }],
    };
    const svg = sceneToSvg(scene);
    expect(svg).toContain('İşaretli &lt;köşe&gt; &amp; &quot;tırnak&quot;');
    expect(svg).not.toContain('<köşe>');
  });

  it('is deterministic — the same scene always serializes to the same SVG', () => {
    const scene: Scene = {
      ...EMPTY_SCENE,
      objects: [
        { id: 'o1', tool: 'circle', x: 50, y: 50, radius: 20 },
        { id: 'o2', tool: 'equal-length-mark', x1: 0, y1: 0, x2: 40, y2: 0, ticks: 2 },
      ],
    };
    expect(sceneToSvg(scene)).toBe(sceneToSvg({ ...scene }));
  });

  it('renders a coordinate-plane with axis lines through its center', () => {
    const scene: Scene = {
      ...EMPTY_SCENE,
      objects: [
        { id: 'o1', tool: 'coordinate-plane', x: 0, y: 0, width: 100, height: 100, step: 25 },
      ],
    };
    const svg = sceneToSvg(scene);
    expect(svg).toContain('<line x1="0" y1="50" x2="100" y2="50"');
    expect(svg).toContain('<line x1="50" y1="0" x2="50" y2="100"');
  });
});
