/**
 * Date + duration helpers.
 *
 * Every timestamp in the domain is an ISO-8601 string; every countdown is
 * computed from an explicit `now` so the logic stays pure and unit testable.
 */

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const ABSOLUTE_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isOverdue: boolean;
  formattedString: string;
}

/**
 * Pure countdown computation between an ISO due date and an explicit timestamp.
 * Overdue deadlines keep counting up (positive values) with `isOverdue: true`.
 */
export function computeRemainingTime(dueDateIsoString: string, currentTimestamp: number): TimeRemaining {
  const dueTimestamp = new Date(dueDateIsoString).getTime();
  const diff = dueTimestamp - currentTimestamp;
  const isOverdue = diff <= 0;
  const absDiff = Math.abs(diff);

  const days = Math.floor(absDiff / DAY_MS);
  const hours = Math.floor((absDiff / HOUR_MS) % 24);
  const minutes = Math.floor((absDiff / MINUTE_MS) % 60);
  const seconds = Math.floor((absDiff / 1000) % 60);

  const pad = (n: number): string => n.toString().padStart(2, '0');
  const formattedString = `${days > 0 ? `${days}d ` : ''}${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

  return {
    days,
    hours,
    minutes,
    seconds,
    isOverdue,
    formattedString,
  };
}

/** Total whole milliseconds until (or since, when overdue) the deadline. */
export function millisecondsUntil(dueDateIsoString: string, currentTimestamp: number = Date.now()): number {
  return new Date(dueDateIsoString).getTime() - currentTimestamp;
}

/** Hour granularity used for deadline urgency styling (`< 12h` warning threshold). */
export function hoursUntil(dueDateIsoString: string, currentTimestamp: number = Date.now()): number {
  return millisecondsUntil(dueDateIsoString, currentTimestamp) / HOUR_MS;
}

export type DeadlineUrgency = 'overdue' | 'critical' | 'warning' | 'comfortable';

export function getDeadlineUrgency(dueDateIsoString: string, currentTimestamp: number = Date.now()): DeadlineUrgency {
  const hours = hoursUntil(dueDateIsoString, currentTimestamp);
  if (hours <= 0) {
    return 'overdue';
  }
  if (hours < 6) {
    return 'critical';
  }
  if (hours < 12) {
    return 'warning';
  }
  return 'comfortable';
}

/** Compact relative label: `just now`, `12m ago`, `3d ago`, `1.2y ago`. */
export function formatRelativeTime(isoString: string, currentTimestamp: number = Date.now()): string {
  const target = new Date(isoString).getTime();
  if (!Number.isFinite(target)) {
    return 'unknown';
  }

  const diff = currentTimestamp - target;
  const absolute = Math.abs(diff);

  if (absolute < MINUTE_MS) {
    return 'just now';
  }
  if (absolute < HOUR_MS) {
    return `${Math.floor(absolute / MINUTE_MS)}m ago`;
  }
  if (absolute < DAY_MS) {
    return `${Math.floor(absolute / HOUR_MS)}h ago`;
  }
  if (absolute < DAY_MS * 30) {
    return `${Math.floor(absolute / DAY_MS)}d ago`;
  }
  if (absolute < DAY_MS * 365) {
    return `${Math.floor(absolute / (DAY_MS * 30))}mo ago`;
  }
  return `${Math.floor(absolute / (DAY_MS * 365))}y ago`;
}

/** Forward-looking relative label used for deadlines: `in 4h`, `2d ago` style. */
export function formatRelativeFuture(isoString: string, currentTimestamp: number = Date.now()): string {
  const target = new Date(isoString).getTime();
  if (!Number.isFinite(target)) {
    return 'unknown';
  }

  const diff = target - currentTimestamp;
  const absolute = Math.abs(diff);
  const unit =
    absolute < HOUR_MS
      ? `${Math.max(1, Math.floor(absolute / MINUTE_MS))}m`
      : absolute < DAY_MS
        ? `${Math.floor(absolute / HOUR_MS)}h`
        : absolute < DAY_MS * 30
          ? `${Math.floor(absolute / DAY_MS)}d`
          : `${Math.floor(absolute / (DAY_MS * 30))}mo`;

  return diff >= 0 ? `in ${unit}` : `${unit} ago`;
}

export function formatAbsoluteDate(isoString: string): string {
  const parsed = new Date(isoString);
  return Number.isFinite(parsed.getTime()) ? ABSOLUTE_DATE_FORMATTER.format(parsed) : 'Unknown date';
}

export function formatShortDate(isoString: string): string {
  const parsed = new Date(isoString);
  return Number.isFinite(parsed.getTime()) ? SHORT_DATE_FORMATTER.format(parsed) : '--';
}

export function formatDateTime(isoString: string): string {
  const parsed = new Date(isoString);
  return Number.isFinite(parsed.getTime()) ? DATE_TIME_FORMATTER.format(parsed) : 'Unknown';
}

/** Duration label for delivery promises: `3 days`, `1 day`, `12 hours`. */
export function formatDeliveryDays(days: number): string {
  if (!Number.isFinite(days) || days <= 0) {
    return 'Instant';
  }
  if (days < 1) {
    return `${Math.round(days * 24)} hours`;
  }
  return `${Math.round(days)} ${Math.round(days) === 1 ? 'day' : 'days'}`;
}

/** Coarse duration label used for earnings clearance: `3 days`, `18 hours`. */
export function formatDurationLabel(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) {
    return 'now';
  }
  if (hours < 24) {
    const whole = Math.floor(hours);
    const minutes = Math.round((hours - whole) * 60);
    return minutes > 0 && whole > 0 ? `${whole}h ${minutes}m` : `${Math.max(minutes, 1)}m`;
  }
  const wholeDays = Math.floor(hours / 24);
  const remainderHours = Math.round(hours % 24);
  return remainderHours > 0 ? `${wholeDays}d ${remainderHours}h` : `${wholeDays}d`;
}

/** ISO string offset from an anchor timestamp, used by the deterministic seed builder. */
export function isoFromOffset(anchorTimestamp: number, days: number, hours = 0): string {
  return new Date(anchorTimestamp + days * DAY_MS + hours * HOUR_MS).toISOString();
}

/** Safe parser returning `null` instead of `NaN` for malformed input. */
export function parseIsoDate(isoString: string): Date | null {
  const parsed = new Date(isoString);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

/** Calendar year component, useful for `year_to_date` metric bucketing. */
export function yearOf(isoString: string): number {
  return parseIsoDate(isoString)?.getUTCFullYear() ?? new Date().getUTCFullYear();
}

/** True when the ISO timestamp falls inside the trailing `days` window. */
export function isWithinLastDays(isoString: string, days: number, currentTimestamp: number = Date.now()): boolean {
  const target = new Date(isoString).getTime();
  if (!Number.isFinite(target)) {
    return false;
  }
  const diff = currentTimestamp - target;
  return diff >= 0 && diff <= days * DAY_MS;
}