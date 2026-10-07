import type { PaintPage } from '@testcim/renderers/paint';

/** What the PDF export needs from the paper that is currently on screen. */
export interface PaperSource {
  readonly title: string;
  readonly className: string;
  /** Questions in paper order, for Word and PowerPoint. */
  readonly questions: readonly { readonly id: string; readonly correctLabel: string | null }[];
  /** Whether the paper prints the answer key; exports follow it. */
  readonly includeAnswers: boolean;
  readonly pages: readonly PaintPage[];
  /** Image key (an item id) to its image address. */
  readonly imageUrls: ReadonlyMap<string, string>;
}

let current: PaperSource | null = null;

/**
 * The preview publishes the paper it laid out; the export buttons in the top bar and the
 * inspector read it, so a download is always exactly what is on screen.
 */
export function registerPaperSource(source: PaperSource | null): void {
  current = source;
}

export function getPaperSource(): PaperSource | null {
  return current;
}
