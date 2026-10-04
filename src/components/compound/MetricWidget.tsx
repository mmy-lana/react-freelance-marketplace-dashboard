import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import type { MetricSeriesPoint } from '../../types/marketplace';
import { cn } from '../../utils/cn';
import { formatCentsToUsd, formatCentsToUsdCompact } from '../../utils/currency';

export type MetricUnit = 'currency' | 'count' | 'percent' | 'rating';

export interface MetricWidgetProps {
  label: string;
  /** Raw value in the unit's native scale (cents for `currency`). */
  value: number;
  unit: MetricUnit;
  /** Percentage change vs the comparison period; omit when unknown. */
  deltaPercent?: number;
  /** Comparison caption, e.g. `vs last week`. */
  deltaCaption?: string;
  /** Sparkline samples, oldest first. */
  points: MetricSeriesPoint[];
  /** Optional leading icon. */
  icon?: ReactNode;
  /** Forces the loading skeleton instead of the metric body. */
  isLoading?: boolean;
  className?: string;
  testId?: string;
}

const VIEWBOX_WIDTH = 120;
const VIEWBOX_HEIGHT = 40;

function formatValue(value: number, unit: MetricUnit): string {
  switch (unit) {
    case 'currency':
      return formatCentsToUsdCompact(value);
    case 'percent':
      return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
    case 'rating':
      return value.toFixed(2);
    case 'count':
      return value.toLocaleString('en-US');
  }
}

function buildSparklinePath(points: MetricSeriesPoint[]): { line: string; area: string; last: { x: number; y: number } | null } {
  if (points.length === 0) {
    return { line: '', area: '', last: null };
  }
  if (points.length === 1) {
    const y = VIEWBOX_HEIGHT / 2;
    return {
      line: `M 0 ${y} L ${VIEWBOX_WIDTH} ${y}`,
      area: `M 0 ${VIEWBOX_HEIGHT} L 0 ${y} L ${VIEWBOX_WIDTH} ${y} L ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT} Z`,
      last: { x: VIEWBOX_WIDTH, y },
    };
  }

  const values = points.map((point) => point.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const stepX = VIEWBOX_WIDTH / (points.length - 1);

  const coordinates = points.map((point, index) => {
    const x = index * stepX;
    const y = VIEWBOX_HEIGHT - ((point.value - min) / range) * (VIEWBOX_HEIGHT - 6) - 3;
    return { x, y };
  });

  const line = coordinates
    .map((coordinate, index) => `${index === 0 ? 'M' : 'L'} ${coordinate.x.toFixed(2)} ${coordinate.y.toFixed(2)}`)
    .join(' ');
  const area = `${line} L ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT} L 0 ${VIEWBOX_HEIGHT} Z`;

  return { line, area, last: coordinates[coordinates.length - 1] };
}

/**
 * Single KPI tile: label, value, period-over-period delta and a sparkline
 * describing the trajectory behind the number.
 */
export function MetricWidget({
  label,
  value,
  unit,
  deltaPercent,
  deltaCaption = 'vs previous period',
  points,
  icon,
  isLoading = false,
  className,
  testId,
}: MetricWidgetProps): React.JSX.Element {
  const { line, area, last } = buildSparklinePath(points);
  const hasDelta = typeof deltaPercent === 'number' && Number.isFinite(deltaPercent);
  const trend = !hasDelta ? 'flat' : deltaPercent > 0 ? 'up' : deltaPercent < 0 ? 'down' : 'flat';

  const trendStyles: Record<typeof trend, string> = {
    up: 'bg-emerald-500/15 text-emerald-300',
    down: 'bg-rose-500/15 text-rose-300',
    flat: 'bg-slate-700/50 text-slate-300',
  };
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;

  const secondaryValue = unit === 'currency' ? formatCentsToUsd(value) : null;

  return (
    <article
      data-testid={testId}
      data-trend={trend}
      className={cn(
        'flex h-[132px] flex-col justify-between rounded-2xl border border-slate-700/70 bg-slate-800/50 p-4',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        {icon ? <span aria-hidden="true" className="text-slate-500">{icon}</span> : null}
      </div>

      {isLoading ? (
        <div className="space-y-2" data-testid={testId ? `${testId}-loading` : undefined}>
          <span className="block h-7 w-28 animate-pulse rounded-lg bg-slate-700/60" />
          <span className="block h-3 w-20 animate-pulse rounded bg-slate-700/40" />
        </div>
      ) : (
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="tabular truncate text-2xl font-bold leading-tight text-white">{formatValue(value, unit)}</p>
            <div className="mt-1 flex items-center gap-2">
              {hasDelta ? (
                <span
                  className={cn(
                    'tabular inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
                    trendStyles[trend]
                  )}
                >
                  <TrendIcon aria-hidden="true" className="size-3" />
                  {Math.abs(deltaPercent).toFixed(1)}%
                </span>
              ) : (
                <span className="text-[11px] text-slate-500">No comparison</span>
              )}
              <span className="truncate text-[11px] text-slate-500">{deltaCaption}</span>
            </div>
          </div>

          <div className="h-12 w-[120px] shrink-0" aria-hidden="true">
            {line ? (
              <svg viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`} preserveAspectRatio="none" className="size-full">
                <defs>
                  <linearGradient id="metric-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={area} fill="url(#metric-fill)" />
                <path
                  d={line}
                  fill="none"
                  stroke={trend === 'down' ? '#fb7185' : '#34d399'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                {last ? (
                  <circle
                    cx={last.x}
                    cy={last.y}
                    r="2.5"
                    fill={trend === 'down' ? '#fb7185' : '#34d399'}
                    vectorEffect="non-scaling-stroke"
                  />
                ) : null}
              </svg>
            ) : (
              <div className="flex size-full items-center justify-center text-[11px] text-slate-500">
                No data
              </div>
            )}
          </div>
        </div>
      )}

      <p className="sr-only">
        {label}: {formatValue(value, unit)}
        {hasDelta ? `, ${Math.abs(deltaPercent).toFixed(1)} percent ${trend} ${deltaCaption}` : ''}
        {secondaryValue ? `, exact ${secondaryValue}` : ''}. Trend points: {points.length}.
      </p>
    </article>
  );
}