import type { RichDoc } from './schemas';

interface RichNodeLike {
  readonly text?: unknown;
  readonly content?: unknown;
}

function isRichNodeLike(value: unknown): value is RichNodeLike {
  return typeof value === 'object' && value !== null;
}

function collectText(node: unknown, out: string[]): void {
  if (!isRichNodeLike(node)) {
    return;
  }
  if (typeof node.text === 'string') {
    out.push(node.text);
  }
  if (Array.isArray(node.content)) {
    for (const child of node.content) {
      collectText(child, out);
    }
  }
}

/**
 * Flattens a TipTap `RichDoc` to plain text, for contexts that only need a
 * short preview (e.g. labelling a passage group in a selector). Unknown or
 * malformed nodes are skipped rather than thrown on, since `richDocSchema`
 * only validates the outer envelope.
 */
export function richDocToPlainText(doc: RichDoc | null | undefined): string {
  if (!doc) {
    return '';
  }
  const out: string[] = [];
  for (const node of doc.content) {
    collectText(node, out);
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}
