import type { DetailedHTMLProps, HTMLAttributes } from 'react';

/**
 * MathLive's `<math-field>` custom element ships no JSX typings (it targets
 * plain DOM usage). This declares just enough for React 19's native custom
 * element support: children carry the initial LaTeX, everything else is
 * read/written imperatively through the element ref (see equation-popover.tsx).
 */
declare module 'react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export {};
