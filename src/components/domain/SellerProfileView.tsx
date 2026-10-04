import { Database, Gauge, RotateCcw, ShieldCheck } from 'lucide-react';
import { Avatar } from '../primitives/Avatar';
import { Badge, SellerLevelBadge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { useMarketplace } from '../../context/MarketplaceContext';
import { useSellerProgression } from '../../hooks/useSellerProgression';
import { cn } from '../../utils/cn';
import { formatCentsToUsd } from '../../utils/currency';
import { formatAbsoluteDate } from '../../utils/date';

const STORAGE_TONES = {
  empty: 'border-slate-600/70 bg-slate-700/40 text-slate-300',
  healthy: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  recovered: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  corrupted: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
} as const;

/**
 * Seller profile workspace: identity card, tier progression snapshot, listing
 * health and the live storage integrity report for the persisted dataset.
 */
export function SellerProfileView(): React.JSX.Element {
  const { currentUser, gigs, orders, myGigs, storageReports, hydrationSource, resetMarketplace } = useMarketplace();
  const progression = useSellerProgression(currentUser);

  const activeGigs = myGigs.filter((gig) => gig.status === 'active').length;
  const pausedGigs = myGigs.filter((gig) => gig.status === 'paused').length;
  const completionRate =
    orders.filter((order) => order.status === 'completed').length > 0
      ? Math.round(
          (orders.filter((order) => order.status === 'completed').length / Math.max(1, orders.length)) * 100
        )
      : currentUser.orderCompletionPercent;

  return (
    <div data-testid="profile-view" className="space-y-6">
      <section
        className="flex flex-col gap-4 rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4 sm:flex-row sm:items-center sm:p-5"
        data-testid="profile-identity"
      >
        <Avatar src={currentUser.avatarUrl} name={currentUser.displayName} size="xl" level={currentUser.level} presence="online" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-white">{currentUser.displayName}</h1>
            <SellerLevelBadge level={currentUser.level} size="md" />
          </div>
          <p className="text-sm text-slate-400">@{currentUser.username} · {currentUser.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            Member since {formatAbsoluteDate(currentUser.memberSince)} · {currentUser.country}
          </p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="tabular text-2xl font-bold text-white">{currentUser.rating.toFixed(2)}</p>
          <p className="text-xs text-slate-500">{currentUser.ratingCount.toLocaleString('en-US')} reviews</p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" data-testid="profile-stats">
        {[
          { label: 'Completed orders', value: currentUser.completedOrdersCount.toLocaleString('en-US') },
          { label: 'Response rate', value: `${currentUser.responseRatePercent}%` },
          { label: 'Avg. response', value: `${currentUser.responseTimeHours}h` },
          { label: 'On-time delivery', value: `${currentUser.onTimeDeliveryPercent}%` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-700/70 bg-slate-800/40 px-3 py-3">
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className="tabular mt-1 text-xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4 sm:p-5" data-testid="profile-tier">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <Gauge aria-hidden="true" className="size-4 text-emerald-400" />
            Tier progress
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {progression.nextLevelLabel
              ? `${progression.currentLevelLabel} → ${progression.nextLevelLabel}`
              : `${progression.currentLevelLabel} · highest tier reached`}
          </p>

          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progression.overallProgressPercent}
            aria-label="Progress toward the next seller tier"
            className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-slate-700/60"
          >
            <div
              className="h-full rounded-full bg-emerald-400"
              style={{ width: `${progression.overallProgressPercent}%` }}
            />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-2">
              <dt className="text-xs text-slate-500">Lifetime earnings</dt>
              <dd className="tabular mt-1 text-base font-semibold text-white">
                {formatCentsToUsd(currentUser.totalEarnedCents)}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 px-3 py-2">
              <dt className="text-xs text-slate-500">Queue completion</dt>
              <dd className="tabular mt-1 text-base font-semibold text-white">{completionRate}%</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4 sm:p-5" data-testid="profile-listings">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <ShieldCheck aria-hidden="true" className="size-4 text-emerald-400" />
            Listing health
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-400">Active listings</dt>
              <dd className="tabular font-semibold text-white">{activeGigs}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-400">Paused listings</dt>
              <dd className="tabular font-semibold text-white">{pausedGigs}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-400">Marketplace gigs</dt>
              <dd className="tabular font-semibold text-white">{gigs.length}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="brand" size="md">
              {activeGigs} live
            </Badge>
            <Badge tone={pausedGigs > 0 ? 'warning' : 'neutral'} size="md">
              {pausedGigs} paused
            </Badge>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4 sm:p-5" data-testid="profile-storage">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <Database aria-hidden="true" className="size-4 text-emerald-400" />
            Local data integrity
          </h2>
          <Badge tone="neutral" size="md" testId="storage-source-badge">
            source: {hydrationSource}
          </Badge>
        </div>

        <ul className="mt-4 space-y-2" data-testid="storage-report-list">
          {storageReports.map((report) => (
            <li
              key={report.key}
              data-testid="storage-report-item"
              data-status={report.status}
              className="flex flex-col gap-1 rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <code className="block truncate text-[11px] text-slate-500">{report.key}</code>
                <p className="text-xs text-slate-300">{report.message}</p>
              </div>
              <span
                className={cn(
                  'inline-flex w-fit shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
                  STORAGE_TONES[report.status]
                )}
              >
                {report.status}
              </span>
            </li>
          ))}
        </ul>

        <Button
          variant="outline"
          className="mt-4"
          testId="profile-reset-data"
          iconLeft={<RotateCcw aria-hidden="true" className="size-4" />}
          onClick={resetMarketplace}
        >
          Reset demo data
        </Button>
      </section>
    </div>
  );
}
