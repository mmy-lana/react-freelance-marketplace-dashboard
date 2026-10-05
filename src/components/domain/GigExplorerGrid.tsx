import { LayoutGrid, Plus, Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { GigCard } from '../compound/GigCard';
import { FilterSlideOver, describeFilters } from '../compound/FilterSlideOver';
import { GigCreationDrawer } from './GigCreationDrawer';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { Input } from '../primitives/Input';
import { SkeletonGrid } from '../primitives/Skeleton';
import { useMarketplace } from '../../context/MarketplaceContext';
import { GIG_CATEGORIES, type GigCategory, type GigItem } from '../../types/marketplace';
import { cn } from '../../utils/cn';

export interface GigExplorerGridProps {
  /** Forces the grid into its loading state (used by the shell on first paint). */
  isLoading?: boolean;
  /** Opens a gig workspace instead of toggling selection when supplied. */
  onSelectGig?: (gig: GigItem) => void;
  /** Hides seller identity blocks while browsing in buyer mode. */
  compactSeller?: boolean;
  className?: string;
}

/**
 * Marketplace explorer.
 *
 * Search is throttled through the context's debounced query, categories form a
 * horizontally scrollable pill ribbon, and the filter surface switches from a
 * mobile drawer to a side menu between 768px and 1024px, then a full sidebar.
 */
export function GigExplorerGrid({
  isLoading = false,
  onSelectGig,
  compactSeller = false,
  className,
}: GigExplorerGridProps): React.JSX.Element {
  const { gigs, filteredGigs, filters, setFilters, resetFilters, categoryCounts, currentUser, toggleGigStatus } =
    useMarketplace();
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isCreationOpen, setIsCreationOpen] = useState(false);
  const [selectedGigIds, setSelectedGigIds] = useState<string[]>([]);

  const activeFilterCount = describeFilters(filters).length;

  const visibleGigs = useMemo(
    () => (filters.category === 'All' ? filteredGigs : filteredGigs.filter((gig) => gig.category === filters.category)),
    [filteredGigs, filters.category]
  );

  const toggleSelected = (gig: GigItem): void => {
    setSelectedGigIds((previous) =>
      previous.includes(gig.id) ? previous.filter((id) => id !== gig.id) : [...previous, gig.id]
    );
  };

  const filterPanel = (
    <FilterSlideOver
      filters={filters}
      onFiltersChange={setFilters}
      onReset={resetFilters}
      resultCount={filteredGigs.length}
      totalCount={gigs.length}
      mode="inline"
      isOpen={false}
      onClose={() => undefined}
      testId="explorer-filters-inline"
    />
  );

  return (
    <section data-testid="gig-explorer" className={cn('w-full', className)}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <Input
              label="Search gigs"
              hideLabel
              testId="explorer-search"
              value={filters.searchQuery}
              onValueChange={(searchQuery) => setFilters((previous) => ({ ...previous, searchQuery }))}
              placeholder="Search by service, category or seller"
              leadingIcon={<Search aria-hidden="true" className="size-4" />}
              trailingSlot={
                filters.searchQuery.length > 0 ? (
                  <button
                    type="button"
                    aria-label="Clear search query"
                    onClick={() => setFilters((previous) => ({ ...previous, searchQuery: '' }))}
                    className="inline-flex size-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                ) : null
              }
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="md:hidden"
              testId="explorer-open-filters"
              iconLeft={<SlidersHorizontal aria-hidden="true" className="size-4" />}
              onClick={() => setIsFilterDrawerOpen(true)}
            >
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </Button>
            <Button testId="explorer-create-gig" iconLeft={<Plus aria-hidden="true" className="size-4" />} onClick={() => setIsCreationOpen(true)}>
              New gig
            </Button>
          </div>
        </div>

        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="group" aria-label="Category filter">
          <button
            type="button"
            onClick={() => setFilters((previous) => ({ ...previous, category: 'All' }))}
            aria-pressed={filters.category === 'All'}
            data-testid="category-pill-All"
            className={cn(
              'inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
              filters.category === 'All'
                ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                : 'border-slate-600 text-slate-300 hover:border-slate-500'
            )}
          >
            <LayoutGrid aria-hidden="true" className="size-4" />
            All
            <span className="tabular text-xs text-slate-400">{gigs.length}</span>
          </button>

          {GIG_CATEGORIES.map((category) => (
            <CategoryPill
              key={category}
              category={category}
              count={categoryCounts[category]}
              isActive={filters.category === category}
              onSelect={() => setFilters((previous) => ({ ...previous, category }))}
            />
          ))}
        </div>

        {activeFilterCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2" data-testid="active-filter-chips">
            {describeFilters({ ...filters, searchQuery: '' }).map((chip) => (
              <Badge key={chip} tone="info" size="md">
                {chip}
              </Badge>
            ))}
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex min-h-[44px] items-center rounded-lg px-2 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Clear all
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-6 lg:flex-row">
        <div className="hidden shrink-0 md:block md:w-64 lg:w-72">{filterPanel}</div>

        <div className="min-w-0 flex-1">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              <span className="tabular font-semibold text-white" data-testid="explorer-result-count">
                {visibleGigs.length}
              </span>{' '}
              {visibleGigs.length === 1 ? 'gig' : 'gigs'} available
            </p>
            {selectedGigIds.length > 0 ? (
              <p className="text-xs text-slate-400" data-testid="explorer-selection-count">
                {selectedGigIds.length} selected for comparison
              </p>
            ) : null}
          </div>

          {isLoading ? (
            <SkeletonGrid count={6} testId="explorer-skeleton" />
          ) : visibleGigs.length === 0 ? (
            <div
              data-testid="explorer-empty-state"
              className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 px-6 py-14 text-center"
            >
              <SearchX aria-hidden="true" className="size-10 text-slate-600" />
              <h3 className="text-base font-semibold text-white">No gigs match these filters</h3>
              <p className="max-w-sm text-sm text-slate-400">
                Try a broader search term, raise the budget ceiling or clear the seller tier restriction.
              </p>
              <Button variant="secondary" testId="explorer-reset-filters" onClick={resetFilters}>
                Reset all filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="explorer-grid">
              {visibleGigs.map((gig) => (
                <GigCard
                  key={gig.id}
                  gig={gig}
                  compactSeller={compactSeller}
                  isSelected={selectedGigIds.includes(gig.id)}
                  onToggleSelect={onSelectGig ? undefined : toggleSelected}
                  onSelect={onSelectGig}
                  onToggleStatus={
                    gig.sellerId === currentUser.id ? (target) => toggleGigStatus(target.id) : undefined
                  }
                  testId={`explorer-gig-${gig.id}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <FilterSlideOver
        mode="drawer"
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onReset={resetFilters}
        resultCount={filteredGigs.length}
        totalCount={gigs.length}
        testId="explorer-filter-drawer"
      />

      {isCreationOpen ? (
        <div className="fixed inset-0 z-[72] flex justify-end bg-slate-950/80 backdrop-blur-sm" data-testid="gig-creation-overlay">
          <div className="h-full w-full max-w-xl animate-sheet-enter overflow-hidden border-l border-slate-700 bg-slate-900">
            <GigCreationDrawer isOpen={isCreationOpen} onClose={() => setIsCreationOpen(false)} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CategoryPill({
  category,
  count,
  isActive,
  onSelect,
}: {
  category: GigCategory;
  count: number;
  isActive: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      data-testid={`category-pill-${category}`}
      className={cn(
        'inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
        isActive
          ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
          : 'border-slate-600 text-slate-300 hover:border-slate-500'
      )}
    >
      {category}
      <span className="tabular text-xs text-slate-400">{count}</span>
    </button>
  );
}
