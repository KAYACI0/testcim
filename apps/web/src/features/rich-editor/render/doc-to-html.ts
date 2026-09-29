import katex from 'katex';

import type { RichDoc } from '@testcim/shared';

interface RichNode {
  readonly type?: string;
  readonly text?: string;
  readonly marks?: readonly { type: string }[];
  readonly attrs?: Record<string, unknown>;
  readonly content?: readonly RichNode[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderMarks(text: string, marks: readonly { type: string }[] = []): string {
  return marks.reduce((inner, mark) => {
    switch (mark.type) {
      case 'bold':
        return `<strong>${inner}</strong>`;
      case 'italic':
        return `<em>${inner}</em>`;
      case 'underline':
        return `<u>${inner}</u>`;
      case 'strike':
        return `<s>${inner}</s>`;
      case 'superscript':
        return `<sup>${inner}</sup>`;
      case 'subscript':
        return `<sub>${inner}</sub>`;
      default:
        return inner;
    }
  }, escapeHtml(text));
}

function renderNode(node: RichNode): string {
  switch (node.type) {
    case 'text':
      return renderMarks(node.text ?? '', node.marks);
    case 'paragraph':
      return `<p>${(node.content ?? []).map(renderNode).join('')}</p>`;
    case 'bulletList':
      return `<ul>${(node.content ?? []).map(renderNode).join('')}</ul>`;
    case 'orderedList':
      return `<ol>${(node.content ?? []).map(renderNode).join('')}</ol>`;
    case 'listItem':
      return `<li>${(node.content ?? []).map(renderNode).join('')}</li>`;
    case 'blockquote':
      return `<blockquote>${(node.content ?? []).map(renderNode).join('')}</blockquote>`;
    case 'horizontalRule':
      return '<hr />';
    case 'hardBreak':
      return '<br />';
    case 'table':
      return `<table>${(node.content ?? []).map(renderNode).join('')}</table>`;
    case 'tableRow':
      return `<tr>${(node.content ?? []).map(renderNode).join('')}</tr>`;
    case 'tableCell':
      return `<td>${(node.content ?? []).map(renderNode).join('')}</td>`;
    case 'tableHeader':
      return `<th>${(node.content ?? []).map(renderNode).join('')}</th>`;
    case 'image': {
      const src = typeof node.attrs?.src === 'string' ? node.attrs.src : '';
      return `<img src="${escapeHtml(src)}" style="max-width:100%" />`;
    }
    case 'equation': {
      const latex = typeof node.attrs?.latex === 'string' ? node.attrs.latex : '';
      try {
        return `<span>${katex.renderToString(latex, { throwOnError: false, displayMode: false })}</span>`;
      } catch {
        return '';
      }
    }
    case 'drawing': {
      const svg = typeof node.attrs?.svg === 'string' ? node.attrs.svg : '';
      return `<div>${svg}</div>`;
    }
    default:
      return (node.content ?? []).map(renderNode).join('');
  }
}

/**
 * Hand-rolled TipTap-JSON-to-HTML renderer, used only to build the offscreen
 * print preview `render-question.ts` rasterizes (docs/02 §5.2). Deliberately
 * not `@tiptap/core`'s `generateHTML` — that needs every extension's live
 * schema loaded and still wouldn't produce a *visual* KaTeX/SVG form for the
 * equation/drawing nodes, only their inert `data-*` serialization. Covers
 * exactly the node/mark vocabulary `RichTextEditor` can produce; an unknown
 * node type falls through to rendering its children.
 */
export function richDocToHtml(doc: RichDoc): string {
  return (doc.content as readonly RichNode[]).map(renderNode).join('');
}
