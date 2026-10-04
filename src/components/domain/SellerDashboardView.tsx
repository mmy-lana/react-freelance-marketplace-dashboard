import { Award, CheckCircle2, TrendingUp, XCircle } from 'lucide-react';
import { MetricWidget } from '../compound/MetricWidget';
import { OrderManagementQueue } from './OrderManagementQueue';
import { Badge, SellerLevelBadge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { useMarketplace } from '../../context/MarketplaceContext';
import { useSellerProgression, type SellerQualificationRequirement } from '../../hooks/useSellerProgression';
import type { MetricSeriesPoint } from '../../types/marketplace';
import { cn } from '../../utils/cn';
import { formatCentsToUsd, formatCentsToUsdWhole } from '../../utils/currency';

function seriesFor(points: MetricSeriesPoint[] | undefined, fallbackLabel: string): MetricSeriesPoint[] {
  return points ?? [{ label: fallbackLabel, value: 0 }];
}

/**
 * Seller control centre: KPI tiles, tier progression checklist and the live
 * order workflow queue restricted to the signed-in seller.
 */
export function SellerDashboardView(): React.JSX.Element {
  const { currentUser, orders, kpiSeries, promoteSellerIfEligible } = useMarketplace();
  const progression = useSellerProgression(currentUser);

  const sellerOrders = orders.filter((order) => order.sellerId === currentUser.id);
  const activeOrders = sellerOrders.filter((order) =>
    ['pending_requirements', 'in_progress', 'delivered', 'revision'].includes(order.status)
  );

  const grossSeries = seriesFor(kpiSeries.find((series) => series.id === 'gross_earnings')?.points, 'W1');
  const activeSeries = seriesFor(kpiSeries.find((series) => series.id === 'active_orders')?.points, 'W1');
  const completionSeries = seriesFor(kpiSeries.find((series) => series.id === 'completion_rate')?.points, 'W1');
  const ratingSeries = seriesFor(kpiSeries.find((series) => series.id === 'average_rating')?.points, 'W1');

  const lastPoint = (points: MetricSeriesPoint[]): number => points[points.length - 1]?.value ?? 0;
  const firstPoint = (points: MetricSeriesPoint[]): number => points[0]?.value ?? 0;
  const delta = (points: MetricSeriesPoint[]): number => {
    const start = firstPoint(points);
    const end = lastPoint(points);
    if (start === 0) {
      return 0;
    }
    return ((end - start) / Math.abs(start)) * 100;
  };

  const activeGrossCents = sellerOrders
    .filter((order) => order.status !== 'cancelled')
    .reduce((sum, order) => sum + order.amountCents, 0);

  return (
    <div data-testid="seller-dashboard" className="space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="seller-metric-grid">
        <MetricWidget
          label="Gross Earnings"
          unit="currency"
          value={lastPoint(grossSeries)}
          deltaPercent={delta(grossSeries)}
          points={grossSeries}
          icon={<TrendingUp aria-hidden="true" className="size-4" />}
          testId="metric-gross-earnings"
        />
        <MetricWidget
          label="Active Orders"
          unit="count"
          value={activeOrders.length}
          deltaPercent={delta(activeSeries)}
          points={activeSeries}
          testId="metric-active-orders"
        />
        <MetricWidget
          label="Completion Rate"
          unit="percent"
          value={currentUser.orderCompletionPercent}
          deltaPercent={delta(completionSeries)}
          points={completionSeries}
          testId="metric-completion-rate"
        />
        <MetricWidget
          label="Average Rating"
          unit="rating"
          value={currentUser.rating}
          deltaPercent={delta(ratingSeries)}
          points={ratingSeries}
          testId="metric-average-rating"
        />
      </section>

      <section
        data-testid="seller-progression"
        className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4 sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold text-white">
              <Award aria-hidden="true" className="size-4 text-amber-400" />
              Seller tier progression
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <SellerLevelBadge level={currentUser.level} size="md" />
              {progression.nextLevelLabel ? (
                <span>
                  <span aria-hidden="true">→</span> {progression.nextLevelLabel}
                </span>
              ) : (
                <span>Highest tier reached</span>
              )}
            </p>
          </div>

          <div className="text-right">
            <p className="tabular text-2xl font-bold text-white" data-testid="progression-percent">
              {progression.overallProgressPercent}%
            </p>
            <p className="text-xs text-slate-500">
              {progression.unmetRequirementCount} requirement
              {progression.unmetRequirementCount === 1 ? '' : 's'} left
            </p>
          </div>
        </div>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progression.overallProgressPercent}
          aria-label="Progress toward the next seller tier"
          className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-700/60"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300 transition-[width] duration-500"
            style={{ width: `${progression.overallProgressPercent}%` }}
          />
        </div>

        {progression.qualification.requirements.length === 0 ? (
          <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            You are a Top Rated seller. New perks are already applied to your account.
          </p>
        ) : (
          <>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2" data-testid="progression-requirements">
              {progression.qualification.requirements.map((requirement) => (
                <RequirementRow key={requirement.label} requirement={requirement} />
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <p className="text-xs text-slate-400">
                Lifetime earnings {formatCentsToUsd(currentUser.totalEarnedCents)} ·{' '}
                {currentUser.completedOrdersCount} completed orders
              </p>
              <Button
                testId="promote-seller"
                disabled={!progression.qualification.eligibleForPromotion}
                onClick={() => promoteSellerIfEligible()}
              >
                {progression.qualification.eligibleForPromotion
                  ? `Promote to ${progression.nextLevelLabel}`
                  : 'Requirements not met yet'}
              </Button>
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-white">Pipeline snapshot</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="pipeline-snapshot">
          {[
            { label: 'Orders in flight', value: String(activeOrders.length) },
            { label: 'Gross booked', value: formatCentsToUsdWhole(activeGrossCents) },
            { label: 'Response rate', value: `${currentUser.responseRatePercent}%` },
            { label: 'Avg. response', value: `${currentUser.responseTimeHours}h` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-2.5">
              <dt className="text-xs text-slate-500">{stat.label}</dt>
              <dd className="tabular mt-1 text-lg font-semibold text-white">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4 sm:p-5">
        <OrderManagementQueue orders={sellerOrders} title="Active order workflow" />
      </section>
    </div>
  );
}

function RequirementRow({ requirement }: { requirement: SellerQualificationRequirement }): React.JSX.Element {
  const ratio = requirement.target === 0 ? 1 : Math.min(requirement.current / requirement.target, 1);
  const percent = Math.round(ratio * 100);

  const targetLabel =
    requirement.unit === 'currency'
      ? formatCentsToUsd(requirement.target)
      : requirement.unit === 'percent'
        ? `${requirement.target}%`
        : requirement.target.toLocaleString('en-US');

  const currentLabel =
    requirement.unit === 'currency'
      ? formatCentsToUsd(requirement.current)
      : requirement.unit === 'percent'
        ? `${requirement.current}%`
        : requirement.current.toLocaleString('en-US');

  return (
    <li
      data-testid="progression-requirement"
      data-met={requirement.isMet ? 'true' : 'false'}
      className={cn(
        'rounded-xl border px-3 py-2.5',
        requirement.isMet ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-700/70 bg-slate-900/50'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          {requirement.isMet ? (
            <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-emerald-400" />
          ) : (
            <XCircle aria-hidden="true" className="size-4 shrink-0 text-slate-500" />
          )}
          <span className="truncate text-sm text-slate-200">{requirement.label}</span>
        </span>
        <Badge tone={requirement.isMet ? 'success' : 'neutral'} size="sm">
          {requirement.isMet ? 'Met' : `${percent}%`}
        </Badge>
      </div>
      <p className="tabular mt-1.5 text-xs text-slate-500">
        {currentLabel} of {targetLabel}
      </p>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-700/60">
        <div
          className={cn('h-full rounded-full', requirement.isMet ? 'bg-emerald-400' : 'bg-amber-400')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </li>
  );
}