'use client';

import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import type { RichDoc } from '@testcim/shared';

import { Drawing } from './extensions/drawing';
import { Equation } from './extensions/equation';
import { RichEditorToolbar } from './toolbar';

import type { Editor, JSONContent } from '@tiptap/react';

import { cn } from '@/lib/cn';

export interface RichTextEditorProps {
  readonly content: RichDoc | null;
  readonly onChange: (doc: RichDoc) => void;
  readonly placeholder: string;
  /** Group passages don't need the equation/drawing/table toolbar — just prose. */
  readonly variant?: 'question' | 'passage';
  readonly onReady?: (editor: Editor) => void;
  readonly className?: string;
}

/**
 * TipTap wrapper shared by the question stem, each option's rich text, the
 * explanation field, and group passages (docs/prompts/07 §2, §7). Heavy deps
 * (MathLive, Konva, JSXGraph) only load when their node views actually mount
 * an equation/drawing, not with this shell — docs/02 §8 performance budget.
 */
export function RichTextEditor({
  content,
  onChange,
  placeholder,
  variant = 'question',
  onReady,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false }),
      Superscript,
      Subscript,
      Image,
      Placeholder.configure({ placeholder }),
      ...(variant === 'question'
        ? [
            Table.configure({ resizable: false }),
            TableRow,
            TableHeader,
            TableCell,
            Equation,
            Drawing,
          ]
        : []),
    ],
    content: (content ?? { type: 'doc', content: [{ type: 'paragraph' }] }) as JSONContent,
    onCreate: ({ editor: created }) => onReady?.(created),
    onUpdate: ({ editor: updated }) => onChange(updated.getJSON() as RichDoc),
    editorProps: {
      attributes: {
        class: cn(
          'prose-testcim min-h-24 rounded-control px-3 py-2 text-sm outline-none',
          className,
        ),
      },
    },
  });

  return (
    <div className="rounded-panel border border-line bg-surface">
      {editor && <RichEditorToolbar editor={editor} variant={variant} />}
      <EditorContent editor={editor} />
    </div>
  );
}
