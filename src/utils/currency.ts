/**
 * Currency helpers.
 *
 * The entire application stores money as integer cents to avoid floating point
 * drift. These helpers are the single conversion boundary to display strings.
 */

const USD_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const USD_WHOLE_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const USD_COMPACT_FORMATTER = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** Converts integer cents into a localized USD string (`formatCentsToUsd(1250) === '$12.50'`). */
export function formatCentsToUsd(cents: number): string {
  if (!Number.isFinite(cents)) {
    return USD_FORMATTER.format(0);
  }
  return USD_FORMATTER.format(cents / 100);
}

/** Rounded USD string for dense tables and chart axes (`formatCentsToUsdWhole(1250) === '$13'`). */
export function formatCentsToUsdWhole(cents: number): string {
  if (!Number.isFinite(cents)) {
    return USD_WHOLE_FORMATTER.format(0);
  }
  return USD_WHOLE_FORMATTER.format(Math.round(cents / 100));
}

/** Compact USD string for KPI tiles (`formatCentsToUsdCompact(1_250_000) === '$12.5K'`). */
export function formatCentsToUsdCompact(cents: number): string {
  if (!Number.isFinite(cents)) {
    return USD_COMPACT_FORMATTER.format(0);
  }
  return USD_COMPACT_FORMATTER.format(cents / 100);
}

/** Signed delta string, always prefixed with `+` for gains and `−` for losses. */
export function formatSignedCentsDelta(cents: number, variant: 'money' | 'percent' = 'money'): string {
  const sign = cents > 0 ? '+' : cents < 0 ? '−' : '';
  const magnitude = Math.abs(cents);
  const formatted = variant === 'percent' ? `${magnitude.toFixed(1)}%` : formatCentsToUsd(magnitude);
  return `${sign}${formatted}`;
}

/** Numeric input value (`<input type="number">`) for a cents amount. */
export function centsToInputValue(cents: number): number {
  if (!Number.isFinite(cents)) {
    return 0;
  }
  return Math.round(cents) / 100;
}

/**
 * Parses a user typed dollar string into integer cents.
 * Returns `null` for invalid input so callers can surface a field level error.
 */
export function parseUsdInputToCents(value: string): number | null {
  const normalized = value.replace(/[^0-9.]/g, '');
  if (normalized.length === 0 || (normalized.match(/\./g) ?? []).length > 1) {
    return null;
  }
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.round(parsed * 100);
}

/** Seller service fee is 20% of the order amount, rounded to the nearest cent. */
export function calculateServiceFeeCents(amountCents: number): number {
  return Math.round(amountCents * 0.2);
}

/** Net revenue after the marketplace service fee. */
export function calculateNetRevenueCents(amountCents: number): number {
  return amountCents - calculateServiceFeeCents(amountCents);
}

/** Percentage helper that never divides by zero. */
export function toPercent(part: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.round((part / total) * 1000) / 10;
}