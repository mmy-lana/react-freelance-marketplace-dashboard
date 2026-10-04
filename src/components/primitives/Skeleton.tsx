import { cn } from '../../utils/cn';

export type SkeletonVariant = 'text' | 'circle' | 'rect' | 'card' | 'chart';

const VARIANT_STYLES: Record<SkeletonVariant, string> = {
  text: 'h-4 w-full rounded',
  circle: 'size-10 rounded-full',
  rect: 'h-24 w-full rounded-xl',
  card: 'h-64 w-full rounded-2xl',
  chart: 'h-24 w-full rounded-xl',
};

export interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
  /** Accessible label for screen readers. */
  label?: string;
  testId?: string;
}

/** Single pulse block. */
export function Skeleton({ variant = 'text', className, label = 'Loading content', testId }: SkeletonProps): React.JSX.Element {
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={label}
      data-testid={testId}
      className={cn('block animate-pulse bg-slate-700/50', VARIANT_STYLES[variant], className)}
    />
  );
}

export interface SkeletonGridProps {
  /** Number of placeholder cards. */
  count?: number;
  className?: string;
  testId?: string;
}

/** Grid of gig-card placeholders mirroring the production card geometry. */
export function SkeletonGrid({ count = 6, className, testId }: SkeletonGridProps): React.JSX.Element {
  return (
    <div
      role="status"
      aria-label="Loading gigs"
      data-testid={testId}
      className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3', className)}
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-800/50"
          aria-hidden="true"
        >
          <div className="aspect-[16/10] w-full animate-pulse bg-slate-700/50" />
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <span className="size-9 animate-pulse rounded-full bg-slate-700/60" />
              <span className="h-3 w-24 animate-pulse rounded bg-slate-700/60" />
            </div>
            <span className="block h-4 w-full animate-pulse rounded bg-slate-700/50" />
            <span className="block h-4 w-2/3 animate-pulse rounded bg-slate-700/50" />
            <div className="flex items-center justify-between pt-2">
              <span className="h-4 w-20 animate-pulse rounded bg-slate-700/60" />
              <span className="h-4 w-14 animate-pulse rounded bg-slate-700/60" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export interface SkeletonListProps {
  rows?: number;
  className?: string;
  testId?: string;
}

/** Dense table rows used by the order queue loader. */
export function SkeletonList({ rows = 5, className, testId }: SkeletonListProps): React.JSX.Element {
  return (
    <div role="status" aria-label="Loading rows" data-testid={testId} className={cn('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="flex min-h-[72px] items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-800/40 p-3"
        >
          <span className="size-11 shrink-0 animate-pulse rounded-lg bg-slate-700/60" />
          <div className="min-w-0 flex-1 space-y-2">
            <span className="block h-3.5 w-3/4 animate-pulse rounded bg-slate-700/60" />
            <span className="block h-3 w-1/3 animate-pulse rounded bg-slate-700/40" />
          </div>
          <span className="h-6 w-20 shrink-0 animate-pulse rounded-full bg-slate-700/50" />
        </div>
      ))}
    </div>
  );
}

/** Seller profile header loader. */
export function SkeletonProfile({ className, testId }: { className?: string; testId?: string }): React.JSX.Element {
  return (
    <div
      role="status"
      aria-label="Loading seller profile"
      data-testid={testId}
      className={cn('flex items-center gap-4 rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4', className)}
    >
      <span aria-hidden="true" className="size-16 shrink-0 animate-pulse rounded-full bg-slate-700/60" />
      <div className="min-w-0 flex-1 space-y-3">
        <span aria-hidden="true" className="block h-4 w-40 animate-pulse rounded bg-slate-700/60" />
        <span aria-hidden="true" className="block h-3 w-64 max-w-full animate-pulse rounded bg-slate-700/40" />
        <div className="flex gap-2 pt-1">
          <span aria-hidden="true" className="h-6 w-20 animate-pulse rounded-full bg-slate-700/50" />
          <span aria-hidden="true" className="h-6 w-16 animate-pulse rounded-full bg-slate-700/50" />
        </div>
      </div>
    </div>
  );
}

/** KPI metric tile loader matching `MetricWidget` height. */
export function SkeletonMetricCard({ className, testId }: { className?: string; testId?: string }): React.JSX.Element {
  return (
    <div
      role="status"
      aria-label="Loading metric"
      data-testid={testId}
      className={cn('h-[132px] rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4', className)}
    >
      <span aria-hidden="true" className="block h-3 w-24 animate-pulse rounded bg-slate-700/50" />
      <span aria-hidden="true" className="mt-3 block h-7 w-32 animate-pulse rounded bg-slate-700/60" />
      <span aria-hidden="true" className="mt-4 block h-10 w-full animate-pulse rounded-lg bg-slate-700/40" />
    </div>
  );
}

/** Full dashboard loader composed from the specialised placeholders above. */
export function SkeletonDashboard({ className }: { className?: string }): React.JSX.Element {
  return (
    <div className={cn('space-y-6', className)}>
      <SkeletonProfile />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonMetricCard key={index} />
        ))}
      </div>
      <SkeletonList rows={4} />
    </div>
  );
}