const WIDTH = 480;
const HEIGHT = 180;
const PADDING = 24;

export interface LineChartPoint {
  readonly label: string;
  readonly value: number;
}

/**
 * Minimal single-series line chart: a thin path in the `--accent` token
 * color, plain axis lines, no shading/shadow/3D effects (docs/03-tasarim-sistemi.md).
 * There is no charting library in this repo; this is deliberately small
 * rather than pulling one in for a single line.
 */
export function LineChart({ points }: { readonly points: readonly LineChartPoint[] }) {
  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(100, ...values);
  const innerWidth = WIDTH - PADDING * 2;
  const innerHeight = HEIGHT - PADDING * 2;

  function toX(index: number): number {
    if (points.length === 1) return PADDING + innerWidth / 2;
    return PADDING + (index / (points.length - 1)) * innerWidth;
  }

  function toY(value: number): number {
    const ratio = (value - minValue) / (maxValue - minValue || 1);
    return PADDING + innerHeight - ratio * innerHeight;
  }

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.value)}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full max-w-lg text-accent"
      role="img"
      aria-label={points.map((p) => `${p.label}: ${p.value}`).join(', ')}
    >
      <line
        x1={PADDING}
        y1={HEIGHT - PADDING}
        x2={WIDTH - PADDING}
        y2={HEIGHT - PADDING}
        stroke="currentColor"
        strokeOpacity={0.2}
      />
      <line
        x1={PADDING}
        y1={PADDING}
        x2={PADDING}
        y2={HEIGHT - PADDING}
        stroke="currentColor"
        strokeOpacity={0.2}
      />
      <path d={path} fill="none" stroke="currentColor" strokeWidth={2} />
      {points.map((p, i) => (
        <circle key={`${p.label}-${i}`} cx={toX(i)} cy={toY(p.value)} r={2.5} fill="currentColor" />
      ))}
    </svg>
  );
}
