import type { DrawingScene } from '@testcim/shared';

import { gridLineColor, strokeColor } from './tokens';

/** Any object the geometry canvas can place, discriminated by `tool`. */
export type SceneObject =
  | { id: string; tool: 'line'; points: [number, number, number, number] }
  | { id: string; tool: 'arrow'; points: [number, number, number, number] }
  | { id: string; tool: 'polygon'; points: number[] }
  | { id: string; tool: 'circle'; x: number; y: number; radius: number }
  | {
      id: string;
      tool: 'arc';
      x: number;
      y: number;
      radius: number;
      angleStart: number;
      angleEnd: number;
    }
  | {
      id: string;
      tool: 'angle-mark';
      x: number;
      y: number;
      radius: number;
      angleStart: number;
      angleEnd: number;
    }
  | { id: string; tool: 'right-angle-mark'; x: number; y: number; size: number; rotation: number }
  | {
      id: string;
      tool: 'equal-length-mark';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      ticks: 1 | 2 | 3;
    }
  | { id: string; tool: 'point-label'; x: number; y: number; label: string }
  | {
      id: string;
      tool: 'measurement';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      label: string;
    }
  | {
      id: string;
      tool: 'coordinate-plane';
      x: number;
      y: number;
      width: number;
      height: number;
      step: number;
    }
  | {
      id: string;
      tool: 'function-graph';
      x: number;
      y: number;
      width: number;
      height: number;
      expression: string;
      xMin: number;
      xMax: number;
      /** Rasterized by JSXGraph offscreen (drawing/function-graph.ts); locked once created. */
      imageDataUrl: string;
    }
  | { id: string; tool: 'text'; x: number; y: number; text: string };

export interface Scene extends Omit<DrawingScene, 'objects'> {
  readonly objects: readonly SceneObject[];
}

export const EMPTY_SCENE: Scene = { version: 1, width: 480, height: 320, objects: [] };

const STROKE_WIDTH = 1.5;

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

/**
 * Renders one scene object to an SVG fragment. This is the single source of
 * truth for "what a shape looks like" — `drawing/canvas.tsx` renders the same
 * objects with Konva for editing, but the *saved* artifact (`attrs.svg`,
 * embedded in the question, docs/prompts/07 §4) always comes from here so
 * the editable source and the printed result can never drift apart.
 */
function objectToSvg(object: SceneObject): string {
  switch (object.tool) {
    case 'line':
      return `<line x1="${object.points[0]}" y1="${object.points[1]}" x2="${object.points[2]}" y2="${object.points[3]}" stroke="${strokeColor()}" stroke-width="${STROKE_WIDTH}" />`;
    case 'arrow': {
      const [x1, y1, x2, y2] = object.points;
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLength = 8;
      const left = [
        x2 - headLength * Math.cos(angle - Math.PI / 6),
        y2 - headLength * Math.sin(angle - Math.PI / 6),
      ];
      const right = [
        x2 - headLength * Math.cos(angle + Math.PI / 6),
        y2 - headLength * Math.sin(angle + Math.PI / 6),
      ];
      return (
        `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor()}" stroke-width="${STROKE_WIDTH}" />` +
        `<polygon points="${x2},${y2} ${left[0]},${left[1]} ${right[0]},${right[1]}" fill="${strokeColor()}" />`
      );
    }
    case 'polygon':
      return `<polygon points="${object.points
        .map((n, i) => (i % 2 === 0 ? n : `,${n} `))
        .join('')
        .trim()}" fill="none" stroke="${strokeColor()}" stroke-width="${STROKE_WIDTH}" />`;
    case 'circle':
      return `<circle cx="${object.x}" cy="${object.y}" r="${object.radius}" fill="none" stroke="${strokeColor()}" stroke-width="${STROKE_WIDTH}" />`;
    case 'arc':
    case 'angle-mark': {
      const startX = object.x + object.radius * Math.cos(object.angleStart);
      const startY = object.y + object.radius * Math.sin(object.angleStart);
      const endX = object.x + object.radius * Math.cos(object.angleEnd);
      const endY = object.y + object.radius * Math.sin(object.angleEnd);
      const largeArc = Math.abs(object.angleEnd - object.angleStart) > Math.PI ? 1 : 0;
      return `<path d="M ${startX} ${startY} A ${object.radius} ${object.radius} 0 ${largeArc} 1 ${endX} ${endY}" fill="none" stroke="${strokeColor()}" stroke-width="${STROKE_WIDTH}" />`;
    }
    case 'right-angle-mark': {
      const { x, y, size, rotation } = object;
      const p1 = [x + size * Math.cos(rotation), y + size * Math.sin(rotation)];
      const p2 = [
        x + size * Math.cos(rotation) + size * Math.cos(rotation + Math.PI / 2),
        y + size * Math.sin(rotation) + size * Math.sin(rotation + Math.PI / 2),
      ];
      const p3 = [
        x + size * Math.cos(rotation + Math.PI / 2),
        y + size * Math.sin(rotation + Math.PI / 2),
      ];
      return `<polyline points="${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]}" fill="none" stroke="${strokeColor()}" stroke-width="${STROKE_WIDTH}" />`;
    }
    case 'equal-length-mark': {
      const midX = (object.x1 + object.x2) / 2;
      const midY = (object.y1 + object.y2) / 2;
      const angle = Math.atan2(object.y2 - object.y1, object.x2 - object.x1) + Math.PI / 2;
      const tickLength = 5;
      const gap = 3;
      const ticks: string[] = [];
      for (let i = 0; i < object.ticks; i += 1) {
        const offset = (i - (object.ticks - 1) / 2) * gap;
        const cx = midX + offset * Math.cos(angle - Math.PI / 2);
        const cy = midY + offset * Math.sin(angle - Math.PI / 2);
        const tx1 = cx + tickLength * Math.cos(angle);
        const ty1 = cy + tickLength * Math.sin(angle);
        const tx2 = cx - tickLength * Math.cos(angle);
        const ty2 = cy - tickLength * Math.sin(angle);
        ticks.push(
          `<line x1="${tx1}" y1="${ty1}" x2="${tx2}" y2="${ty2}" stroke="${strokeColor()}" stroke-width="${STROKE_WIDTH}" />`,
        );
      }
      return ticks.join('');
    }
    case 'point-label':
      return (
        `<circle cx="${object.x}" cy="${object.y}" r="2.5" fill="${strokeColor()}" />` +
        `<text x="${object.x + 6}" y="${object.y - 6}" font-size="13" fill="${strokeColor()}">${escapeXml(object.label)}</text>`
      );
    case 'measurement': {
      const midX = (object.x1 + object.x2) / 2;
      const midY = (object.y1 + object.y2) / 2;
      return (
        `<line x1="${object.x1}" y1="${object.y1}" x2="${object.x2}" y2="${object.y2}" stroke="${strokeColor()}" stroke-width="1" stroke-dasharray="4 2" />` +
        `<text x="${midX}" y="${midY - 4}" font-size="12" fill="${strokeColor()}" text-anchor="middle">${escapeXml(object.label)}</text>`
      );
    }
    case 'coordinate-plane': {
      const { x, y, width, height, step } = object;
      const lines: string[] = [];
      for (let gx = x; gx <= x + width; gx += step) {
        lines.push(
          `<line x1="${gx}" y1="${y}" x2="${gx}" y2="${y + height}" stroke="${gridLineColor()}" stroke-width="0.75" />`,
        );
      }
      for (let gy = y; gy <= y + height; gy += step) {
        lines.push(
          `<line x1="${x}" y1="${gy}" x2="${x + width}" y2="${gy}" stroke="${gridLineColor()}" stroke-width="0.75" />`,
        );
      }
      const centerX = x + width / 2;
      const centerY = y + height / 2;
      lines.push(
        `<line x1="${x}" y1="${centerY}" x2="${x + width}" y2="${centerY}" stroke="${strokeColor()}" stroke-width="1.25" />`,
      );
      lines.push(
        `<line x1="${centerX}" y1="${y}" x2="${centerX}" y2="${y + height}" stroke="${strokeColor()}" stroke-width="1.25" />`,
      );
      return lines.join('');
    }
    case 'function-graph':
      return `<image x="${object.x}" y="${object.y}" width="${object.width}" height="${object.height}" href="${object.imageDataUrl}" />`;
    case 'text':
      return `<text x="${object.x}" y="${object.y}" font-size="14" fill="${strokeColor()}">${escapeXml(object.text)}</text>`;
    default:
      return '';
  }
}

/** Flattens a scene to a standalone SVG string — the artifact stored as `drawing` node `attrs.svg`. */
export function sceneToSvg(scene: Scene): string {
  const body = scene.objects.map(objectToSvg).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}">${body}</svg>`;
}
