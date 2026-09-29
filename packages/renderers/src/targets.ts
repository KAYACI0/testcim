import type { LayoutDocument } from '@testcim/layout-engine';

export const RENDER_TARGETS = ['html', 'pdf', 'docx', 'pptx'] as const;

export type RenderTarget = (typeof RENDER_TARGETS)[number];

export function isRenderTarget(value: unknown): value is RenderTarget {
  return typeof value === 'string' && (RENDER_TARGETS as readonly string[]).includes(value);
}

export interface RenderResult {
  readonly target: RenderTarget;
  readonly mime: string;
  readonly bytes: Uint8Array;
}

/**
 * Every renderer consumes the same LayoutDocument. Renderers place blocks; they never
 * decide where a block goes.
 */
export interface Renderer<TOptions = unknown> {
  readonly target: RenderTarget;
  render(document: LayoutDocument, options: TOptions): Promise<RenderResult>;
}
