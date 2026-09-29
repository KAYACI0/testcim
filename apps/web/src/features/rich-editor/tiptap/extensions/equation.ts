import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

import type { EquationAttrs } from '@testcim/shared';

import { EquationNodeView } from '../../equation/equation-node-view';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    equation: {
      /** Inserts an equation node at the current selection, opened for editing. */
      insertEquation: (attrs?: Partial<EquationAttrs>) => ReturnType;
    };
  }
}

/**
 * Inline atom node for a MathLive/KaTeX equation (docs/prompts/07 §3). Stores
 * only the LaTeX source (`attrs.latex`) — KaTeX re-renders it on every
 * display, so nothing else needs persisting. `atom: true` (via `inline` +
 * no `content`) makes it a single selectable unit, matching how ProseMirror
 * expects opaque embeds to behave.
 */
export const Equation = Node.create({
  name: 'equation',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      latex: { default: '' },
      altText: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-equation]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-equation': '',
        'data-latex': String(node.attrs.latex ?? ''),
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EquationNodeView);
  },

  addCommands() {
    return {
      insertEquation:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { latex: '', altText: '', ...attrs },
          }),
    };
  },
});
