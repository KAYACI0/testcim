import {
  ArrowsDownUp,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  Check,
  CheckCircle,
  Circle,
  ClipboardText,
  Clock,
  DotsThreeVertical,
  Exam,
  FileText,
  Folder,
  Function,
  Gear,
  GraduationCap,
  Image,
  ListBullets,
  ListNumbers,
  MagnifyingGlass,
  Minus,
  PencilSimple,
  Plus,
  Polygon,
  ScanSmiley,
  ChartBar,
  SquaresFour,
  Student,
  Table,
  TextB,
  TextItalic,
  TextSubscript,
  TextSuperscript,
  TextUnderline,
  Trash,
  UploadSimple,
  Warning,
  WarningCircle,
  X,
} from '@phosphor-icons/react/ssr';

import type { Icon as PhosphorIcon, IconWeight } from '@phosphor-icons/react';

/**
 * Every icon the product is allowed to render. docs/03 section 2 forbids sparkle,
 * magic-wand, robot, brain, lightbulb, rocket and lightning glyphs (AI clichés); those
 * names are simply never imported here, so they cannot reach the UI through this
 * wrapper.
 */
const ICONS = {
  'arrows-down-up': ArrowsDownUp,
  'caret-down': CaretDown,
  'caret-left': CaretLeft,
  'caret-right': CaretRight,
  'caret-up': CaretUp,
  check: Check,
  'check-circle': CheckCircle,
  circle: Circle,
  'clipboard-text': ClipboardText,
  clock: Clock,
  'dots-three-vertical': DotsThreeVertical,
  exam: Exam,
  'file-text': FileText,
  folder: Folder,
  function: Function,
  gear: Gear,
  'graduation-cap': GraduationCap,
  image: Image,
  'list-bullets': ListBullets,
  'list-numbers': ListNumbers,
  'magnifying-glass': MagnifyingGlass,
  minus: Minus,
  'pencil-simple': PencilSimple,
  plus: Plus,
  polygon: Polygon,
  'scan-smiley': ScanSmiley,
  'chart-bar': ChartBar,
  'squares-four': SquaresFour,
  student: Student,
  table: Table,
  'text-b': TextB,
  'text-italic': TextItalic,
  'text-subscript': TextSubscript,
  'text-superscript': TextSuperscript,
  'text-underline': TextUnderline,
  trash: Trash,
  'upload-simple': UploadSimple,
  warning: Warning,
  'warning-circle': WarningCircle,
  x: X,
} satisfies Record<string, PhosphorIcon>;

export type IconName = keyof typeof ICONS;

export interface IconProps {
  readonly name: IconName;
  readonly size?: number;
  readonly weight?: Extract<IconWeight, 'light' | 'fill'>;
  readonly className?: string;
  readonly 'aria-hidden'?: boolean;
  readonly 'aria-label'?: string;
}

export function Icon({ name, size = 20, weight = 'light', className, ...aria }: IconProps) {
  const Component = ICONS[name];
  const hasLabel = Boolean(aria['aria-label']);

  return (
    <Component
      size={size}
      weight={weight}
      className={className}
      aria-hidden={hasLabel ? undefined : (aria['aria-hidden'] ?? true)}
      aria-label={aria['aria-label']}
      role={hasLabel ? 'img' : undefined}
    />
  );
}
