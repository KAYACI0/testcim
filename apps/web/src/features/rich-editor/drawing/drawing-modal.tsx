'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { DrawingCanvas } from './canvas';
import { EMPTY_SCENE, sceneToSvg } from './serialize';

import type { Scene } from './serialize';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';

/** The `drawing` node's attrs, typed with our editor-local `Scene` rather than
 * the shared package's looser `DrawingScene` (see `drawing/serialize.ts`). */
export interface DrawingNodeAttrs {
  readonly scene: Scene;
  readonly svg: string;
  readonly altText: string;
}

export interface DrawingModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly initial: DrawingNodeAttrs;
  readonly onSubmit: (attrs: DrawingNodeAttrs) => void;
}

/**
 * Dialog wrapper around `DrawingCanvas` (docs/prompts/07 §4): editing
 * happens on a local draft, and only "Kaydet" flattens it to the `attrs.svg`
 * that actually gets saved (via `sceneToSvg`) — cancelling never touches the
 * question's stored drawing.
 */
export function DrawingModal({ open, onOpenChange, initial, onSubmit }: DrawingModalProps) {
  const t = useTranslations('richEditor.drawing');
  const [scene, setScene] = useState<Scene>(initial.scene ?? EMPTY_SCENE);
  const [altText, setAltText] = useState(initial.altText ?? '');

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setScene(initial.scene ?? EMPTY_SCENE);
          setAltText(initial.altText ?? '');
        }
        onOpenChange(next);
      }}
    >
      <DialogContent title={t('modalTitle')} closeLabel={t('cancel')} className="max-w-3xl">
        <DrawingCanvas scene={scene} onChange={setScene} />
        <label className="mt-3 block text-xs text-ink-2" htmlFor="drawing-alt-text">
          {t('altTextLabel')}
        </label>
        <input
          id="drawing-alt-text"
          value={altText}
          onChange={(event) => setAltText(event.target.value)}
          placeholder={t('altTextPlaceholder')}
          className="mt-1 w-full rounded-control border border-line bg-canvas px-2 py-1.5 text-sm"
        />
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button
            onClick={() => {
              onSubmit({ scene, svg: sceneToSvg(scene), altText });
              onOpenChange(false);
            }}
          >
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
