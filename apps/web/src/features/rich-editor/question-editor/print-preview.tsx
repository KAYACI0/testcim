import type { RichDoc } from '@testcim/shared';

import { richDocToHtml } from '../render/doc-to-html';

import type { EditableOption } from '../types';

const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

/**
 * Off-DOM (rendered, never visible) print layout for a question — the exact
 * node `render-question.ts` rasterizes into the `assets` row the layout
 * engine places (docs/02 §5.2). Kept out of the main flow with plain black-
 * on-white styling since it must look right on paper, not match the editor
 * chrome around it.
 */
export function QuestionPrintPreview({
  stemRich,
  options,
}: {
  readonly stemRich: RichDoc;
  readonly options: readonly EditableOption[];
}) {
  return (
    <div style={{ width: 640, padding: 16, background: 'white', color: 'black', fontSize: 15 }}>
      <div dangerouslySetInnerHTML={{ __html: richDocToHtml(stemRich) }} />
      {options.length > 0 && (
        <ol style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
          {options.map((option, index) => (
            <li key={option.key} style={{ marginTop: 6 }}>
              {LETTERS[index] ?? index + 1}){' '}
              {option.richText ? (
                <span
                  dangerouslySetInnerHTML={{ __html: richDocToHtml(option.richText as RichDoc) }}
                />
              ) : (
                option.text
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
