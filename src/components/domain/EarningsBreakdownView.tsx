import { Download, Landmark, PiggyBank, Wallet } from 'lucide-react';
import { useMemo } from 'react';
import { CountdownClock } from '../compound/CountdownClock';
import { Badge, type BadgeTone } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { useMarketplace } from '../../context/MarketplaceContext';
import { useToast } from '../../context/ToastContext';
import type { LedgerEntry } from '../../types/marketplace';
import { cn } from '../../utils/cn';
import { formatCentsToUsd, formatCentsToUsdWhole } from '../../utils/currency';
import { formatDateTime, formatRelativeTime } from '../../utils/date';

const STATUS_TONES: Record<LedgerEntry['status'], BadgeTone> = {
  available: 'success',
  pending_clearance: 'warning',
  paid_out: 'info',
  refunded: 'danger',
};

const STATUS_LABELS: Record<LedgerEntry['status'], string> = {
  available: 'Available',
  pending_clearance: 'Pending clearance',
  paid_out: 'Paid out',
  refunded: 'Refunded',
};

function escapeCsvValue(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildLedgerCsv(entries: LedgerEntry[]): string {
  const header = ['Order', 'Gig', 'Gross (USD)', 'Fee (USD)', 'Net (USD)', 'Created', 'Available', 'Status', 'Method'];
  const rows = entries.map((entry) => [
    entry.orderNumber,
    entry.gigTitle,
    (entry.grossCents / 100).toFixed(2),
    (entry.feeCents / 100).toFixed(2),
    (entry.netCents / 100).toFixed(2),
    entry.createdAt,
    entry.availableAt,
    entry.status,
    entry.method,
  ]);
  return [header, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\n');
}

/**
 * Earnings and finances workspace: balances, the pending clearance countdown,
 * a filterable ledger and a real CSV export generated in the browser.
 */
export function EarningsBreakdownView(): React.JSX.Element {
  const { currentUser, ledger } = useMarketplace();
  const { pushToast } = useToast();

  const totals = useMemo(() => {
    return ledger.reduce(
      (accumulator, entry) => {
        accumulator[entry.status] += entry.netCents;
        return accumulator;
      },
      {
        available: 0,
        pending_clearance: 0,
        paid_out: 0,
        refunded: 0,
      } as Record<LedgerEntry['status'], number>
    );
  }, [ledger]);

  const nextClearance = useMemo(
    () =>
      ledger
        .filter((entry) => entry.status === 'pending_clearance')
        .sort((a, b) => Date.parse(a.availableAt) - Date.parse(b.availableAt))[0] ?? null,
    [ledger]
  );

  const handleExport = (): void => {
    if (ledger.length === 0) {
      pushToast({ tone: 'warning', title: 'Nothing to export', description: 'The ledger is empty.' });
      return;
    }

    const csv = buildLedgerCsv(ledger);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gighub-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    pushToast({
      tone: 'success',
      title: 'Ledger exported',
      description: `${ledger.length} transaction(s) written to CSV.`,
    });
  };

  return (
    <div data-testid="earnings-view" className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3" data-testid="earnings-balances">
        <BalanceTile
          label="Available balance"
          value={currentUser.availableBalanceCents}
          icon={<Wallet aria-hidden="true" className="size-4" />}
          caption="Ready for instant payout"
          testId="balance-available"
        />
        <BalanceTile
          label="Pending clearance"
          value={currentUser.pendingClearanceCents}
          icon={<Landmark aria-hidden="true" className="size-4" />}
          caption="Releases 7 days after delivery"
          testId="balance-pending"
          trailing={
            nextClearance ? (
              <CountdownClock dueDateIsoString={nextClearance.availableAt} size="sm" hideLabel testId="clearance-countdown" />
            ) : null
          }
        />
        <BalanceTile
          label="Lifetime earnings"
          value={currentUser.totalEarnedCents}
          icon={<PiggyBank aria-hidden="true" className="size-4" />}
          caption={`${currentUser.completedOrdersCount} completed orders`}
          testId="balance-lifetime"
        />
      </section>

      <section className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">Transaction ledger</h2>
            <p className="text-xs text-slate-400">
              {formatCentsToUsd(totals.available)} available · {formatCentsToUsd(totals.pending_clearance)} clearing ·{' '}
              {formatCentsToUsd(totals.paid_out)} paid out
            </p>
          </div>
          <Button
            variant="secondary"
            testId="earnings-export-csv"
            iconLeft={<Download aria-hidden="true" className="size-4" />}
            onClick={handleExport}
          >
            Export CSV
          </Button>
        </div>

        {ledger.length === 0 ? (
          <div
            data-testid="earnings-empty-state"
            className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-6 py-12 text-center"
          >
            <Wallet aria-hidden="true" className="size-9 text-slate-600" />
            <h3 className="text-sm font-semibold text-white">No transactions yet</h3>
            <p className="max-w-sm text-xs text-slate-400">
              Completed orders appear here with their gross amount, service fee and net revenue.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-slate-700/70 md:block">
              <table className="w-full min-w-[720px] border-collapse">
                <caption className="sr-only">Earnings ledger</caption>
                <thead>
                  <tr className="border-b border-slate-700/70 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-3 py-3 font-medium">
                      Order
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Gig
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Gross
                    </th>
                    <th scope="col" className="hidden px-3 py-3 font-medium lg:table-cell">
                      Fee
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Net
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3 font-medium">
                      Available
                    </th>
                  </tr>
                </thead>
                <tbody data-testid="ledger-table-body">
                  {ledger.map((entry) => (
                    <tr key={entry.id} data-testid={`ledger-row-${entry.id}`} className="border-b border-slate-800/80 last:border-b-0">
                      <th scope="row" className="tabular px-3 py-3 text-left text-xs font-medium text-slate-400">
                        {entry.orderNumber}
                      </th>
                      <td className="max-w-[260px] px-3 py-3">
                        <span className="line-clamp-1 text-sm text-slate-200">{entry.gigTitle}</span>
                      </td>
                      <td className="tabular px-3 py-3 text-sm text-slate-300">{formatCentsToUsd(entry.grossCents)}</td>
                      <td className="tabular hidden px-3 py-3 text-sm text-slate-400 lg:table-cell">
                        −{formatCentsToUsd(entry.feeCents)}
                      </td>
                      <td className="tabular px-3 py-3 text-sm font-semibold text-white">{formatCentsToUsd(entry.netCents)}</td>
                      <td className="px-3 py-3">
                        <Badge tone={STATUS_TONES[entry.status]} size="sm">
                          {STATUS_LABELS[entry.status]}
                        </Badge>
                      </td>
                      <td className="tabular px-3 py-3 text-xs text-slate-400">{formatDateTime(entry.availableAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="mt-4 space-y-2 md:hidden" data-testid="ledger-card-list">
              {ledger.map((entry) => (
                <li
                  key={entry.id}
                  data-testid={`ledger-card-${entry.id}`}
                  className="rounded-2xl border border-slate-700/70 bg-slate-900/50 p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="tabular text-xs font-semibold text-slate-400">{entry.orderNumber}</p>
                      <p className="line-clamp-2 text-sm text-slate-200">{entry.gigTitle}</p>
                    </div>
                    <span className="tabular shrink-0 text-sm font-bold text-white">{formatCentsToUsd(entry.netCents)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={STATUS_TONES[entry.status]} size="sm">
                      {STATUS_LABELS[entry.status]}
                    </Badge>
                    <span className="tabular text-xs text-slate-500">{formatRelativeTime(entry.createdAt)}</span>
                  </div>
                  <p className="tabular mt-1.5 text-xs text-slate-500">
                    Gross {formatCentsToUsd(entry.grossCents)} · fee −{formatCentsToUsd(entry.feeCents)} ·{' '}
                    {entry.method}
                  </p>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-xs text-slate-500">
              Lifetime settled: <span className="tabular">{formatCentsToUsdWhole(totals.paid_out + totals.available)}</span>
            </p>
          </>
        )}
      </section>
    </div>
  );
}

function BalanceTile({
  label,
  value,
  icon,
  caption,
  trailing,
  testId,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  caption: string;
  trailing?: React.ReactNode;
  testId?: string;
}): React.JSX.Element {
  return (
    <article
      data-testid={testId}
      className={cn('flex flex-col gap-2 rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4')}
    >
      <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
        <span aria-hidden="true" className="text-slate-500">
          {icon}
        </span>
        {label}
      </p>
      <p className="tabular text-2xl font-bold text-white">{formatCentsToUsd(value)}</p>
      {trailing}
      <p className="text-xs text-slate-500">{caption}</p>
    </article>
  );
}
