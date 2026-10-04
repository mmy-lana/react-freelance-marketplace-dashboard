import { useMemo, useState } from 'react';
import { CountdownClock } from './components/compound/CountdownClock';
import { FilterSlideOver, describeFilters } from './components/compound/FilterSlideOver';
import { GigCard } from './components/compound/GigCard';
import { MetricWidget } from './components/compound/MetricWidget';
import { OrderCardItem } from './components/compound/OrderCardItem';
import { OrderRowItem } from './components/compound/OrderRowItem';
import { OrderTimelineTracker } from './components/compound/OrderTimelineTracker';
import { PackageTierMatrix } from './components/compound/PackageTierMatrix';
import { Badge } from './components/primitives/Badge';
import { Button } from './components/primitives/Button';
import { SlidersHorizontal } from 'lucide-react';
import {
  GIG_CATEGORIES,
  type GigFilterState,
  type OrderStatus,
  type PackageTier,
} from './types/marketplace';
import { createSeedDataset } from './utils/seedData';

const DEFAULT_FILTERS: GigFilterState = {
  searchQuery: '',
  category: 'All',
  minBudget: 0,
  maxBudget: 0,
  deliveryMaxDays: 0,
  sellerLevels: [],
  sortBy: 'relevance',
};

function Section({
  title,
  description,
  children,
  testId,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  testId: string;
}): React.JSX.Element {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-800/40 p-4 sm:p-5" data-testid={testId}>
      <h2 className="text-base font-semibold text-white">{title}</h2>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * Phase 3 view: exercises every compound molecule in its production context.
 * Replaced by the marketplace shell once the domain layers land.
 */
export default function App(): React.JSX.Element {
  const dataset = useMemo(() => createSeedDataset(), []);
  const [filters, setFilters] = useState<GigFilterState>(DEFAULT_FILTERS);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PackageTier>('standard');
  const [selectedGigIds, setSelectedGigIds] = useState<string[]>([]);
  const [transitionedOrders, setTransitionedOrders] = useState<Record<string, OrderStatus>>({});

  const featuredGig = dataset.gigs[0];
  const trackedOrder = dataset.orders[0];
  const overdueOrder = dataset.orders.find((order) => Date.parse(order.dueDate) <= Date.now()) ?? dataset.orders[1];

  const handleTransition = (orderId: string, status: OrderStatus): void => {
    setTransitionedOrders((previous) => ({ ...previous, [orderId]: status }));
  };

  const toggleSelection = (gigId: string): void => {
    setSelectedGigIds((previous) =>
      previous.includes(gigId) ? previous.filter((id) => id !== gigId) : [...previous, gigId]
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100" data-testid="app-shell">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500 text-lg font-bold text-slate-950">
              F
            </span>
            <span className="text-lg font-bold tracking-tight text-white">GigHub</span>
          </div>
          <Badge tone="brand" testId="phase-badge">
            Phase 3 · Compound Components
          </Badge>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 pb-[calc(var(--nav-bottom-height)+24px)] sm:px-6"
        data-testid="compound-view"
      >
        <Section
          testId="section-gig-card"
          title="GigCard"
          description="16:10 media slider, seller identity, clamped title, rating and pricing footer."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="gig-card-grid">
            {dataset.gigs.slice(0, 3).map((gig) => (
              <GigCard
                key={gig.id}
                gig={gig}
                testId={`gig-card-${gig.id}`}
                isSelected={selectedGigIds.includes(gig.id)}
                onToggleSelect={() => toggleSelection(gig.id)}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Selected for comparison: <span data-testid="selected-count">{selectedGigIds.length}</span>
          </p>
        </Section>

        <Section
          testId="section-package-matrix"
          title="PackageTierMatrix"
          description="Three tier comparison: swipe rail on mobile, three column grid from 768px."
        >
          <PackageTierMatrix
            packages={featuredGig.packages}
            activeTier={selectedTier}
            onSelectTier={setSelectedTier}
            testId="package-matrix"
          />
          <p className="mt-3 text-xs text-slate-500">
            Selected tier: <span data-testid="selected-tier">{selectedTier}</span>
          </p>
        </Section>

        <Section
          testId="section-metric"
          title="MetricWidget"
          description="KPI tiles with delta indicator and trajectory sparkline."
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="metric-grid">
            {dataset.kpiSeries.map((series, index) => (
              <MetricWidget
                key={series.id}
                label={series.label}
                unit={series.unit === 'currency' ? 'currency' : series.unit === 'percent' ? 'percent' : series.unit}
                value={series.points[series.points.length - 1]?.value ?? 0}
                deltaPercent={index === 0 ? 12.4 : index === 1 ? -3.1 : 4.2}
                deltaCaption="vs last week"
                points={series.points}
                testId={`metric-${series.id}`}
              />
            ))}
          </div>
        </Section>

        <Section
          testId="section-timeline"
          title="OrderTimelineTracker & CountdownClock"
          description="Lifecycle rail derived from the status machine plus a live deadline badge."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <OrderTimelineTracker
              status={transitionedOrders[trackedOrder.id] ?? trackedOrder.status}
              milestones={trackedOrder.milestones}
              testId="timeline-active"
            />
            <div className="space-y-3">
              <p className="text-sm text-slate-400">
                {overdueOrder.orderNumber} · {overdueOrder.gigTitle}
              </p>
              <CountdownClock dueDateIsoString={overdueOrder.dueDate} status={overdueOrder.status} size="lg" testId="countdown-overdue" />
              <CountdownClock dueDateIsoString={trackedOrder.dueDate} status={trackedOrder.status} size="lg" testId="countdown-upcoming" />
              <Button
                variant="secondary"
                size="sm"
                testId="timeline-advance"
                onClick={() => handleTransition(trackedOrder.id, 'delivered')}
              >
                Advance timeline
              </Button>
            </div>
          </div>
        </Section>

        <Section
          testId="section-orders"
          title="OrderRowItem & OrderCardItem"
          description="Desktop ledger row collapses columns below 1024px; mobile cards stack with a full width CTA."
        >
          <div className="mb-4 flex flex-wrap items-center gap-2 md:hidden">
            <Button
              variant="secondary"
              testId="open-filter-drawer"
              iconLeft={<SlidersHorizontal aria-hidden="true" className="size-4" />}
              onClick={() => setIsDrawerOpen(true)}
            >
              Filters ({describeFilters(filters).length})
            </Button>
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-slate-700/70 md:block" data-testid="order-table-wrapper">
            <table className="w-full min-w-[720px] border-collapse">
              <caption className="sr-only">Active and historical orders</caption>
              <thead>
                <tr className="border-b border-slate-700/70 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-3 py-3 font-medium">
                    Order
                  </th>
                  <th scope="col" className="hidden px-3 py-3 font-medium xl:table-cell">
                    Buyer
                  </th>
                  <th scope="col" className="hidden px-3 py-3 font-medium lg:table-cell">
                    Started
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Amount
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Deadline
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody data-testid="order-table-body">
                {dataset.orders.slice(0, 5).map((order) => (
                  <OrderRowItem
                    key={order.id}
                    order={
                      transitionedOrders[order.id]
                        ? { ...order, status: transitionedOrders[order.id] as OrderStatus }
                        : order
                    }
                    onTransition={handleTransition}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden" data-testid="order-card-list">
            {dataset.orders.slice(0, 3).map((order) => (
              <OrderCardItem
                key={order.id}
                order={
                  transitionedOrders[order.id]
                    ? { ...order, status: transitionedOrders[order.id] as OrderStatus }
                    : order
                }
                onTransition={handleTransition}
              />
            ))}
          </div>
        </Section>

        <Section
          testId="section-filter"
          title="FilterSlideOver"
          description="Inline sidebar from 1024px, bottom sheet drawer below it."
        >
          <div className="hidden lg:block">
            <FilterSlideOver
              mode="inline"
              isOpen={false}
              onClose={() => undefined}
              filters={filters}
              onFiltersChange={setFilters}
              onReset={() => setFilters(DEFAULT_FILTERS)}
              resultCount={dataset.gigs.length}
              totalCount={dataset.gigs.length}
              testId="filter-inline"
            />
          </div>
          <p className="text-xs text-slate-500 lg:hidden">
            On small screens the same controls render inside the drawer opened from the queue header.
          </p>
          <FilterSlideOver
            mode="drawer"
            isOpen={isDrawerOpen}
            onClose={() => setIsDrawerOpen(false)}
            filters={filters}
            onFiltersChange={setFilters}
            onReset={() => setFilters(DEFAULT_FILTERS)}
            resultCount={dataset.gigs.filter((gig) => (filters.category === 'All' ? true : gig.category === filters.category)).length}
            totalCount={dataset.gigs.length}
            testId="filter-drawer"
          />
        </Section>

        <p className="text-xs text-slate-500">
          Categories in seed: {GIG_CATEGORIES.length}. Gigs: {dataset.gigs.length}.
        </p>
      </main>

      <div aria-hidden="true" className="h-[var(--nav-bottom-height)]" />
    </div>
  );
}