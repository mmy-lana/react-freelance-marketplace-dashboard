import { Timer } from 'lucide-react';
import { useOrderCountdown } from '../../hooks/useOrderCountdown';
import type { OrderStatus } from '../../types/marketplace';
import { cn } from '../../utils/cn';
import { computeRemainingTime, getDeadlineUrgency } from '../../utils/date';

export type CountdownSize = 'sm' | 'md' | 'lg';

/** Terminal statuses stop the clock; the badge becomes a static label. */
const TERMINAL_STATUSES: readonly OrderStatus[] = ['completed', 'cancelled'];

const SIZE_STYLES: Record<CountdownSize, { root: string; unit: string; label: string }> = {
  sm: { root: 'gap-1 px-2 py-1 text-xs', unit: 'min-w-[2ch] text-xs', label: 'text-[10px]' },
  md: { root: 'gap-1.5 px-2.5 py-1.5 text-sm', unit: 'min-w-[2ch] text-sm', label: 'text-[11px]' },
  lg: { root: 'gap-2 px-3 py-2 text-base', unit: 'min-w-[2ch] text-base', label: 'text-xs' },
};

export interface CountdownClockProps {
  /** ISO-8601 deadline the clock counts towards. */
  dueDateIsoString: string;
  /** Order status; completed/cancelled orders render a static label instead. */
  status?: OrderStatus;
  size?: CountdownSize;
  /** Hide the "Due" / "Overdue by" prefix text. */
  hideLabel?: boolean;
  className?: string;
  testId?: string;
}

interface UnitProps {
  value: number;
  suffix: string;
  className: string;
}

function TimeUnit({ value, suffix, className }: UnitProps): React.JSX.Element {
  return (
    <span className="inline-flex items-baseline">
      <span className={cn('tabular inline-block min-w-[2ch] text-right', className)}>{value}</span>
      <span className={cn('tabular ml-0.5 opacity-70', className)} aria-hidden="true">
        {suffix}
      </span>
    </span>
  );
}

/**
 * Real-time deadline display.
 *
 * Every unit is rendered in its own `<span>` with a `2ch` floor and tabular
 * numerals so the layout never shifts while seconds tick. Amber warns under
 * 12 hours, rose pulses once the deadline is missed.
 */
export function CountdownClock({
  dueDateIsoString,
  status,
  size = 'md',
  hideLabel = false,
  className,
  testId,
}: CountdownClockProps): React.JSX.Element {
  const isTerminal = status !== undefined && TERMINAL_STATUSES.includes(status);
  const remaining = useOrderCountdown(dueDateIsoString, { paused: isTerminal });
  const styles = SIZE_STYLES[size];
  const urgency = getDeadlineUrgency(dueDateIsoString);

  const tone =
    isTerminal || status === 'completed'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
      : remaining.isOverdue
        ? 'border-rose-500/50 bg-rose-500/10 text-rose-300'
        : urgency === 'critical'
          ? 'border-rose-400/40 bg-rose-400/10 text-rose-300'
          : urgency === 'warning'
            ? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
            : 'border-slate-600/70 bg-slate-800/60 text-slate-200';

  const label = isTerminal
    ? status === 'completed'
      ? 'Completed'
      : 'Cancelled'
    : remaining.isOverdue
      ? 'Overdue by'
      : 'Due in';

  const staticRemaining = isTerminal ? computeRemainingTime(dueDateIsoString, Date.now()) : remaining;

  return (
    <span
      data-testid={testId}
      data-overdue={remaining.isOverdue ? 'true' : 'false'}
      className={cn(
        'inline-flex items-center rounded-lg border font-medium tabular',
        styles.root,
        tone,
        remaining.isOverdue && !isTerminal && 'animate-pulse-ring',
        className
      )}
    >
      <Timer aria-hidden="true" className="size-3.5 shrink-0" />
      {hideLabel ? null : <span className={cn('uppercase tracking-wide opacity-70', styles.label)}>{label}</span>}
      <span
        className="flex items-center gap-1"
        role="timer"
        aria-label={
          isTerminal
            ? `Order ${label.toLowerCase()}`
            : `${label} ${staticRemaining.days} days, ${staticRemaining.hours} hours, ${staticRemaining.minutes} minutes, ${staticRemaining.seconds} seconds`
        }
      >
        {staticRemaining.days > 0 ? (
          <>
            <TimeUnit value={staticRemaining.days} suffix="d" className={styles.unit} />
            <span aria-hidden="true" className="opacity-50">
              :
            </span>
          </>
        ) : null}
        <TimeUnit value={staticRemaining.hours} suffix="h" className={styles.unit} />
        <span aria-hidden="true" className="opacity-50">
          :
        </span>
        <TimeUnit value={staticRemaining.minutes} suffix="m" className={styles.unit} />
        <span aria-hidden="true" className="opacity-50">
          :
        </span>
        <TimeUnit value={staticRemaining.seconds} suffix="s" className={styles.unit} />
      </span>
    </span>
  );
}