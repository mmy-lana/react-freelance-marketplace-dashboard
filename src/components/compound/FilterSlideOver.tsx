import { Filter, RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { Select, type SelectOption } from '../primitives/Select';
import {
  GIG_CATEGORIES,
  SELLER_LEVELS,
  SELLER_LEVEL_LABELS,
  type GigCategory,
  type GigFilterState,
  type SellerLevel,
} from '../../types/marketplace';
import { cn } from '../../utils/cn';
import { centsToInputValue, formatCentsToUsd, parseUsdInputToCents } from '../../utils/currency';

const CATEGORY_OPTIONS: SelectOption<GigCategory | 'All'>[] = [
  { value: 'All', label: 'All categories' },
  ...GIG_CATEGORIES.map((category) => ({ value: category, label: category })),
];

const DELIVERY_OPTIONS: SelectOption<string>[] = [
  { value: '0', label: 'Any delivery time' },
  { value: '3', label: 'Up to 3 days' },
  { value: '7', label: 'Up to 7 days' },
  { value: '14', label: 'Up to 14 days' },
  { value: '30', label: 'Up to 30 days' },
];

const SORT_OPTIONS: SelectOption<GigFilterState['sortBy']>[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating', label: 'Highest rated' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'orders_count', label: 'Most ordered' },
];

export interface FilterSlideOverProps {
  /** Drawer mode visibility (mobile). */
  isOpen: boolean;
  onClose: () => void;
  /** `drawer` renders a bottom sheet, `inline` renders the desktop sidebar. */
  mode: 'drawer' | 'inline';
  filters: GigFilterState;
  onFiltersChange: (filters: GigFilterState) => void;
  onReset: () => void;
  /** Number of gigs matching the current filter set. */
  resultCount: number;
  /** Total gigs before filtering, used for the empty-state contrast. */
  totalCount: number;
  className?: string;
  testId?: string;
}

function FilterBody({
  filters,
  onFiltersChange,
  onReset,
  resultCount,
  totalCount,
}: Pick<
  FilterSlideOverProps,
  'filters' | 'onFiltersChange' | 'onReset' | 'resultCount' | 'totalCount'
>): React.JSX.Element {
  const [minBudgetDraft, setMinBudgetDraft] = useState(String(centsToInputValue(filters.minBudget)));
  const [maxBudgetDraft, setMaxBudgetDraft] = useState(String(centsToInputValue(filters.maxBudget)));
  const [rangeError, setRangeError] = useState<string | undefined>(undefined);

  useEffect(() => {
    setMinBudgetDraft(String(centsToInputValue(filters.minBudget)));
    setMaxBudgetDraft(String(centsToInputValue(filters.maxBudget)));
  }, [filters.minBudget, filters.maxBudget]);

  const commitBudgetRange = (minDraft: string, maxDraft: string): void => {
    const minCents = minDraft.trim().length === 0 ? 0 : parseUsdInputToCents(minDraft);
    const maxCents = maxDraft.trim().length === 0 ? 0 : parseUsdInputToCents(maxDraft);

    if (minCents === null || maxCents === null) {
      setRangeError('Budget values must be numbers in US dollars.');
      return;
    }
    if (maxCents > 0 && minCents > maxCents) {
      setRangeError('Minimum budget cannot be greater than the maximum budget.');
      return;
    }

    setRangeError(undefined);
    onFiltersChange({ ...filters, minBudget: minCents, maxBudget: maxCents });
  };

  const toggleSellerLevel = (level: SellerLevel): void => {
    const next = filters.sellerLevels.includes(level)
      ? filters.sellerLevels.filter((entry) => entry !== level)
      : [...filters.sellerLevels, level];
    onFiltersChange({ ...filters, sellerLevels: next });
  };

  return (
    <div className="space-y-5">
      <Select
        label="Category"
        testId="filter-category"
        value={filters.category}
        onValueChange={(category) => onFiltersChange({ ...filters, category })}
        options={CATEGORY_OPTIONS}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Min budget"
          testId="filter-min-budget"
          inputMode="decimal"
          value={minBudgetDraft}
          onValueChange={setMinBudgetDraft}
          onBlur={() => commitBudgetRange(minBudgetDraft, maxBudgetDraft)}
          placeholder="0"
          size="sm"
          error={rangeError}
          helperText="USD"
        />
        <Input
          label="Max budget"
          testId="filter-max-budget"
          inputMode="decimal"
          value={maxBudgetDraft}
          onValueChange={setMaxBudgetDraft}
          onBlur={() => commitBudgetRange(minBudgetDraft, maxBudgetDraft)}
          placeholder="1000"
          size="sm"
          helperText="USD"
        />
      </div>

      <Select
        label="Maximum delivery time"
        testId="filter-delivery"
        value={String(filters.deliveryMaxDays)}
        onValueChange={(value) => onFiltersChange({ ...filters, deliveryMaxDays: Number(value) })}
        options={DELIVERY_OPTIONS}
      />

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-300">Seller tier</legend>
        <div className="flex flex-wrap gap-2">
          {SELLER_LEVELS.map((level) => {
            const isActive = filters.sellerLevels.includes(level);
            return (
              <button
                key={level}
                type="button"
                aria-pressed={isActive}
                data-testid={`filter-level-${level}`}
                onClick={() => toggleSellerLevel(level)}
                className={cn(
                  'inline-flex min-h-[44px] items-center rounded-full border px-3.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-emerald-400/70 bg-emerald-500/15 text-emerald-300'
                    : 'border-slate-600 text-slate-300 hover:border-slate-500'
                )}
              >
                {SELLER_LEVEL_LABELS[level]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <Select
        label="Sort by"
        testId="filter-sort"
        value={filters.sortBy}
        onValueChange={(sortBy) => onFiltersChange({ ...filters, sortBy })}
        options={SORT_OPTIONS}
      />

      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-2.5">
        <p className="text-xs text-slate-400">
          <span className="tabular font-semibold text-white">{resultCount}</span> of{' '}
          <span className="tabular">{totalCount}</span> gigs match
        </p>
        <Button variant="ghost" size="sm" testId="filter-reset" iconLeft={<RotateCcw aria-hidden="true" className="size-4" />} onClick={onReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}

/**
 * Filter surface for the gig explorer.
 *
 * - `inline` renders the persistent desktop sidebar (>= 1024px)
 * - `drawer` renders a slide-over bottom sheet below the layout breakpoint,
 *   closing on Escape or backdrop press
 */
export function FilterSlideOver({
  isOpen,
  onClose,
  mode,
  filters,
  onFiltersChange,
  onReset,
  resultCount,
  totalCount,
  className,
  testId,
}: FilterSlideOverProps): React.JSX.Element | null {
  useEffect(() => {
    if (mode !== 'drawer' || !isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, isOpen, onClose]);

  // Scroll lock. Without it the page behind the sheet keeps scrolling under the
  // backdrop on touch devices, which reads as a gesture glitch. The previous
  // inline value is captured and restored so nested locks never clobber each
  // other, and unmounting mid-open cannot leave the document unscrollable.
  useEffect(() => {
    if (mode !== 'drawer' || !isOpen || typeof document === 'undefined') {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mode, isOpen]);

  if (mode === 'inline') {
    return (
      <aside
        data-testid={testId ?? 'filter-inline'}
        aria-label="Gig filters"
        className={cn('w-full shrink-0 rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4', className)}
      >
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          <Filter aria-hidden="true" className="size-4" />
          Filters
        </h2>
        <FilterBody
          filters={filters}
          onFiltersChange={onFiltersChange}
          onReset={onReset}
          resultCount={resultCount}
          totalCount={totalCount}
        />
      </aside>
    );
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[65] md:hidden" data-testid={testId ?? 'filter-drawer'}>
      <div
        aria-hidden="true"
        data-testid="filter-drawer-backdrop"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-slate-950/80 backdrop-blur-sm"
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Gig filters"
        data-testid="filter-drawer-panel"
        className="absolute inset-x-0 bottom-0 max-h-[85vh] animate-sheet-enter overflow-y-auto overscroll-contain rounded-t-2xl border-t border-slate-700 bg-slate-900 px-4 pb-[calc(var(--nav-bottom-height)+16px)] pt-4"
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-slate-700" aria-hidden="true" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <Filter aria-hidden="true" className="size-4 text-emerald-400" />
            Filters
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            data-testid="filter-drawer-close"
            className="inline-flex size-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <FilterBody
          filters={filters}
          onFiltersChange={onFiltersChange}
          onReset={onReset}
          resultCount={resultCount}
          totalCount={totalCount}
        />

        <Button fullWidth size="lg" className="mt-5" testId="filter-apply" onClick={onClose}>
          Show {resultCount} {resultCount === 1 ? 'gig' : 'gigs'}
        </Button>
      </section>
    </div>
  );
}

/** Human readable summary of the active filters, used by the explorer header. */
export function describeFilters(filters: GigFilterState): string[] {
  const chips: string[] = [];
  if (filters.category !== 'All') {
    chips.push(filters.category);
  }
  if (filters.minBudget > 0) {
    chips.push(`Min ${formatCentsToUsd(filters.minBudget)}`);
  }
  if (filters.maxBudget > 0) {
    chips.push(`Max ${formatCentsToUsd(filters.maxBudget)}`);
  }
  if (filters.deliveryMaxDays > 0) {
    chips.push(`≤ ${filters.deliveryMaxDays} days`);
  }
  for (const level of filters.sellerLevels) {
    chips.push(SELLER_LEVEL_LABELS[level]);
  }
  return chips;
}