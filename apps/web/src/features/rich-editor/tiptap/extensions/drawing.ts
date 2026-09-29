import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';

import type { DrawingAttrs } from '@testcim/shared';

import { DrawingNodeView } from '../../drawing/drawing-node-view';
import { EMPTY_SCENE } from '../../drawing/serialize';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    drawing: {
      /** Inserts a drawing node at the current selection, opened for editing. */
      insertDrawing: (attrs?: Partial<DrawingAttrs>) => ReturnType;
    };
  }
}

/**
 * Block atom node for a Konva geometry drawing (docs/prompts/07 §4). Stores
 * the editable scene (`attrs.scene`, our own JSON — see `drawing/serialize.ts`)
 * plus its flattened `attrs.svg` so the node view (and the final question
 * render, docs/02 §5.2) never has to re-run Konva just to display it.
 */
export const Drawing = Node.create({
  name: 'drawing',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      scene: { default: EMPTY_SCENE },
      svg: { default: '' },
      altText: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-drawing]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-drawing': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DrawingNodeView);
  },

  addCommands() {
    return {
      insertDrawing:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { scene: EMPTY_SCENE, svg: '', altText: '', ...attrs },
          }),
    };
  },
});
