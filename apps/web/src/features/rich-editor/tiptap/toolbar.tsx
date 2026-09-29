'use client';

import { useTranslations } from 'next-intl';

import type { Editor } from '@tiptap/react';

import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Tooltip } from '@/components/ui/tooltip';

function uploadImage(editor: Editor) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    editor.chain().focus().setImage({ src: url }).run();
  };
  input.click();
}

export interface RichEditorToolbarProps {
  readonly editor: Editor;
  readonly variant: 'question' | 'passage';
}

/**
 * Formatting bar for `RichTextEditor` (docs/prompts/07 §2, §6). Ctrl+M
 * (equation) and Ctrl+D (drawing) are bound as TipTap keyboard shortcuts on
 * the node extensions themselves (`extensions/equation.ts`,
 * `extensions/drawing.ts`) so they fire from anywhere the caret is in the
 * document, not only when a toolbar button has focus.
 */
export function RichEditorToolbar({ editor, variant }: RichEditorToolbarProps) {
  const t = useTranslations('richEditor.toolbar');

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-line p-1">
      <Tooltip content={t('bold')}>
        <IconButton
          label={t('bold')}
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Icon name="text-b" />
        </IconButton>
      </Tooltip>
      <Tooltip content={t('italic')}>
        <IconButton
          label={t('italic')}
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Icon name="text-italic" />
        </IconButton>
      </Tooltip>
      <Tooltip content={t('underline')}>
        <IconButton
          label={t('underline')}
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Icon name="text-underline" />
        </IconButton>
      </Tooltip>
      <Tooltip content={t('superscript')}>
        <IconButton
          label={t('superscript')}
          active={editor.isActive('superscript')}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        >
          <Icon name="text-superscript" />
        </IconButton>
      </Tooltip>
      <Tooltip content={t('subscript')}>
        <IconButton
          label={t('subscript')}
          active={editor.isActive('subscript')}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
        >
          <Icon name="text-subscript" />
        </IconButton>
      </Tooltip>
      <Tooltip content={t('bulletList')}>
        <IconButton
          label={t('bulletList')}
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <Icon name="list-bullets" />
        </IconButton>
      </Tooltip>
      <Tooltip content={t('orderedList')}>
        <IconButton
          label={t('orderedList')}
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <Icon name="list-numbers" />
        </IconButton>
      </Tooltip>
      <Tooltip content={t('horizontalRule')}>
        <IconButton
          label={t('horizontalRule')}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Icon name="minus" />
        </IconButton>
      </Tooltip>
      <Tooltip content={t('image')}>
        <IconButton label={t('image')} onClick={() => uploadImage(editor)}>
          <Icon name="image" />
        </IconButton>
      </Tooltip>
      {variant === 'question' && (
        <>
          <Tooltip content={t('table')}>
            <IconButton
              label={t('table')}
              onClick={() =>
                editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()
              }
            >
              <Icon name="table" />
            </IconButton>
          </Tooltip>
          <Tooltip content={t('equation')}>
            <IconButton
              label={t('equation')}
              onClick={() => editor.chain().focus().insertEquation().run()}
            >
              <Icon name="function" />
            </IconButton>
          </Tooltip>
          <Tooltip content={t('drawing')}>
            <IconButton
              label={t('drawing')}
              onClick={() => editor.chain().focus().insertDrawing().run()}
            >
              <Icon name="polygon" />
            </IconButton>
          </Tooltip>
        </>
      )}
    </div>
  );
}
