import { useMemo } from 'react';
import { useLocalStorageSync } from './hooks/useLocalStorageSync';
import { GIG_CATEGORIES, SELLER_LEVEL_LABELS, ORDER_STATUS_LABELS } from './types/marketplace';
import { formatCentsToUsd } from './utils/currency';
import { computeRemainingTime, formatAbsoluteDate, formatRelativeTime } from './utils/date';
import { generateSafeId } from './utils/id';
import { createSeedDataset, SEED_GIG_CATEGORY_COUNTS } from './utils/seedData';
import { inspectStorageHealth, isStorageWritable, readRawStorageValue, STORAGE_KEYS } from './utils/storage';

const STATUS_BADGE_TONES: Record<string, string> = {
  empty: 'border-slate-700 bg-slate-800/60 text-slate-300',
  healthy: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  recovered: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  corrupted: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
};

/**
 * Phase 1 foundation view: renders the persistence + utility layer diagnostics
 * that the marketplace shell consumes from Phase 2 onward.
 */
export default function App(): React.JSX.Element {
  const [lastSessionId, setLastSessionId] = useLocalStorageSync('gighub:session:v1', generateSafeId('session'));
  const dataset = useMemo(() => createSeedDataset(), []);
  const reports = useMemo(() => inspectStorageHealth(), []);
  const writable = useMemo(() => isStorageWritable(), []);
  const rawGigs = readRawStorageValue(STORAGE_KEYS.gigs);
  const dueSoonest = dataset.orders.reduce((closest, order) =>
    Date.parse(order.dueDate) < Date.parse(closest.dueDate) ? order : closest
  );
  const countdown = computeRemainingTime(dueSoonest.dueDate, Date.now());

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100" data-testid="app-shell">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-lg font-bold text-slate-950">
              F
            </span>
            <span className="text-lg font-bold tracking-tight text-white">GigHub</span>
          </div>
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            Phase 1 · Platform Foundation
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 pb-[calc(var(--nav-bottom-height)+24px)] sm:px-6">
        <section className="rounded-xl border border-slate-800 bg-slate-800/40 p-5" data-testid="foundation-view">
          <h1 className="text-lg font-semibold text-white">Persistence &amp; type foundation</h1>
          <p className="mt-1 text-sm text-slate-400">
            Seeded dataset, storage integrity probe and utility verification. This panel is replaced by the
            marketplace shell once the domain layers land.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Gigs seeded', value: String(dataset.gigs.length) },
              { label: 'Orders seeded', value: String(dataset.orders.length) },
              { label: 'Storage writable', value: writable ? 'yes' : 'no' },
              { label: 'Stored gig payload', value: rawGigs.state },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-3">
                <dt className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</dt>
                <dd className="mt-1 text-lg font-semibold text-white">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-800/40 p-5">
          <h2 className="text-base font-semibold text-white">Storage integrity report</h2>
          <ul className="mt-4 space-y-2" data-testid="storage-report">
            {reports.map((report) => (
              <li
                key={report.key}
                className="flex flex-col gap-1 rounded-lg border border-slate-700/70 bg-slate-900/60 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <code className="text-xs text-slate-400">{report.key}</code>
                  <p className="text-sm text-slate-300">{report.message}</p>
                </div>
                <span
                  className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_TONES[report.status] ?? STATUS_BADGE_TONES.healthy}`}
                >
                  {report.status}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-5">
            <h2 className="text-base font-semibold text-white">Category coverage</h2>
            <ul className="mt-3 space-y-2 text-sm" data-testid="category-coverage">
              {GIG_CATEGORIES.map((category) => (
                <li key={category} className="flex items-center justify-between gap-3">
                  <span className="text-slate-300">{category}</span>
                  <span className="rounded-md bg-slate-900/70 px-2 py-0.5 text-xs font-medium text-slate-300">
                    {SEED_GIG_CATEGORY_COUNTS[category]} gigs
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-5">
            <h2 className="text-base font-semibold text-white">Utility verification</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Current profile</span>
                <span>
                  {dataset.profile.displayName} · {SELLER_LEVEL_LABELS[dataset.profile.level]}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Lifetime earnings</span>
                <span className="tabular-nums">{formatCentsToUsd(dataset.profile.totalEarnedCents)}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Member since</span>
                <span>{formatAbsoluteDate(dataset.profile.memberSince)}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Last order updated</span>
                <span>{formatRelativeTime(dataset.orders[0].updatedAt)}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Soonest deadline</span>
                <span className="tabular-nums">
                  {dueSoonest.orderNumber} · {countdown.formattedString}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Order statuses</span>
                <span>{Object.values(ORDER_STATUS_LABELS).join(', ')}</span>
              </li>
              <li className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Session id (persisted)</span>
                <code className="truncate text-xs text-slate-400">{lastSessionId}</code>
              </li>
            </ul>
            <button
              type="button"
              onClick={() => setLastSessionId(generateSafeId('session'))}
              className="mt-4 min-h-[44px] w-full rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Regenerate persisted session id
            </button>
          </div>
        </section>
      </main>

      <div aria-hidden="true" className="h-[var(--nav-bottom-height)]" />
    </div>
  );
}