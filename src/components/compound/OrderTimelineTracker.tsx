import { Check, CircleDashed, CircleSlash, RotateCcw, Truck } from 'lucide-react';
import {
  ORDER_STATUS_LABELS,
  ORDER_TIMELINE_STAGES,
  type OrderMilestone,
  type OrderStatus,
} from '../../types/marketplace';
import { cn } from '../../utils/cn';
import { formatShortDate } from '../../utils/date';

/** Index of the active stage for each status; `revision` branches off `delivered`. */
const STAGE_INDEX: Record<OrderStatus, number> = {
  pending_requirements: 0,
  in_progress: 1,
  delivered: 2,
  revision: 2,
  completed: 3,
  cancelled: -1,
};

export interface OrderTimelineTrackerProps {
  status: OrderStatus;
  /** Optional milestone list rendered beneath the stage rail. */
  milestones?: OrderMilestone[];
  /** Horizontal layout for compact table contexts. */
  orientation?: 'vertical' | 'horizontal';
  className?: string;
  testId?: string;
}

/**
 * Vertical stepped progress indicator derived from the order status machine.
 *
 * `pending_requirements → in_progress → delivered → completed` is the happy
 * path; `revision` re-opens the delivery step and `cancelled` replaces the rail
 * with an explicit terminal state.
 */
export function OrderTimelineTracker({
  status,
  milestones = [],
  orientation = 'vertical',
  className,
  testId,
}: OrderTimelineTrackerProps): React.JSX.Element {
  const activeIndex = STAGE_INDEX[status];
  const isCancelled = status === 'cancelled';
  const isRevision = status === 'revision';

  if (isCancelled) {
    return (
      <div
        data-testid={testId}
        data-order-status={status}
        className={cn('rounded-xl border border-slate-700/70 bg-slate-900/60 p-4', className)}
      >
        <p className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <CircleSlash aria-hidden="true" className="size-4 text-slate-400" />
          Order cancelled
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {ORDER_STATUS_LABELS.cancelled} orders leave the active queue and keep their history for reporting.
        </p>
      </div>
    );
  }

  const stages = ORDER_TIMELINE_STAGES.map((stage, index) => {
    const isComplete = index < activeIndex || (index === activeIndex && status === 'completed');
    const isCurrent = index === activeIndex && status !== 'completed';
    return { stage, isComplete, isCurrent };
  });

  return (
    <div data-testid={testId} data-order-status={status} className={cn('w-full', className)}>
      <ol
        aria-label="Order lifecycle"
        className={cn(
          'flex gap-2',
          orientation === 'vertical' ? 'flex-col' : 'flex-row items-start gap-1 sm:gap-2'
        )}
      >
        {stages.map(({ stage, isComplete, isCurrent }, index) => (
          <li key={stage} className={cn('flex min-w-0', orientation === 'vertical' ? 'flex-col' : 'flex-1 flex-col')}>
            <div className={cn('flex items-center', orientation === 'vertical' ? 'flex-row gap-3' : 'flex-col gap-1')}>
              <span className="relative flex shrink-0 items-center justify-center">
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full border-2 transition-colors',
                    isComplete
                      ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                      : isCurrent
                        ? 'border-emerald-400 bg-slate-900 text-emerald-400'
                        : 'border-slate-600 bg-slate-900 text-slate-500'
                  )}
                >
                  {isComplete ? (
                    <Check className="size-4" />
                  ) : isCurrent && stage === 'delivered' ? (
                    <Truck className="size-4" />
                  ) : (
                    <CircleDashed className="size-4" />
                  )}
                </span>
                {index < stages.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      orientation === 'vertical' ? 'absolute left-1/2 top-8 h-4 w-0.5 -translate-x-1/2' : 'hidden',
                      isComplete ? 'bg-emerald-400' : 'bg-slate-700'
                    )}
                  />
                ) : null}
              </span>

              <div className={cn('min-w-0', orientation === 'vertical' ? 'pb-3' : 'px-1 text-center')}>
                <p
                  className={cn(
                    'truncate text-xs font-medium',
                    isCurrent ? 'text-emerald-300' : isComplete ? 'text-slate-300' : 'text-slate-500'
                  )}
                >
                  {ORDER_STATUS_LABELS[stage]}
                </p>
                {isCurrent ? (
                  <p className="text-[11px] text-slate-500">
                    {isRevision && stage === 'delivered' ? 'Revision in progress' : 'Current stage'}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {isRevision ? (
        <p className="mt-3 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          <RotateCcw aria-hidden="true" className="size-3.5" />
          Buyer requested changes — redeliver to resume the lifecycle.
        </p>
      ) : null}

      {milestones.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-slate-800 pt-3">
          {milestones.map((milestone) => (
            <li key={milestone.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-block size-2 shrink-0 rounded-full',
                    milestone.isCompleted ? 'bg-emerald-400' : 'bg-slate-600'
                  )}
                />
                <span className={cn('truncate', milestone.isCompleted ? 'text-slate-300' : 'text-slate-400')}>
                  {milestone.title}
                </span>
              </span>
              <span className="tabular shrink-0 text-slate-500">{formatShortDate(milestone.dueDate)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}