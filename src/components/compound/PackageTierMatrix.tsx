import { Check, Clock3, RefreshCcw, Sparkles } from 'lucide-react';
import {
  PACKAGE_TIER_LABELS,
  PACKAGE_TIERS,
  type GigPackage,
  type PackageTier,
} from '../../types/marketplace';
import { cn } from '../../utils/cn';
import { formatCentsToUsd } from '../../utils/currency';
import { formatDeliveryDays } from '../../utils/date';

/** Standard is the marketplace convention for the highlighted tier. */
const FEATURED_TIER: PackageTier = 'standard';

const TIER_ACCENTS: Record<PackageTier, string> = {
  basic: 'border-slate-600/70',
  standard: 'border-emerald-400/70 ring-1 ring-emerald-400/30',
  premium: 'border-amber-400/60',
};

export interface PackageTierMatrixProps {
  packages: Record<PackageTier, GigPackage>;
  /** Currently selected tier; renders as a pressed state. */
  activeTier?: PackageTier;
  /** Fired when a tier is chosen (e.g. from the gig creation drawer). */
  onSelectTier?: (tier: PackageTier) => void;
  /** Hides the selection affordance when the matrix is read-only. */
  readOnly?: boolean;
  className?: string;
  testId?: string;
}

function TierColumn({
  gigPackage,
  selected,
  onSelect,
  readOnly,
}: {
  gigPackage: GigPackage;
  selected: boolean;
  onSelect?: (tier: PackageTier) => void;
  readOnly: boolean;
}): React.JSX.Element {
  const isFeatured = gigPackage.tier === FEATURED_TIER;
  const isSelectable = !readOnly && typeof onSelect === 'function';

  return (
    <div
      className={cn(
        'flex h-full w-[78vw] max-w-[320px] shrink-0 snap-center flex-col rounded-2xl border bg-slate-800/50 p-4 transition-colors sm:w-auto sm:max-w-none sm:basis-0',
        TIER_ACCENTS[gigPackage.tier],
        selected && 'border-emerald-400'
      )}
      data-testid={`tier-${gigPackage.tier}`}
      data-selected={selected ? 'true' : 'false'}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          {PACKAGE_TIER_LABELS[gigPackage.tier]}
        </h4>
        {isFeatured ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
            <Sparkles aria-hidden="true" className="size-3" />
            Most popular
          </span>
        ) : null}
      </div>

      <p className="mt-1 text-sm text-slate-400">{gigPackage.title}</p>
      <p className="tabular mt-3 text-2xl font-bold text-white">{formatCentsToUsd(gigPackage.priceCents)}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{gigPackage.description}</p>

      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/60 px-2.5 py-2 text-slate-300">
          <Clock3 aria-hidden="true" className="size-3.5 text-emerald-400" />
          <span className="tabular">{formatDeliveryDays(gigPackage.deliveryDays)}</span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-900/60 px-2.5 py-2 text-slate-300">
          <RefreshCcw aria-hidden="true" className="size-3.5 text-emerald-400" />
          <span className="tabular">
            {gigPackage.revisions} revision{gigPackage.revisions === 1 ? '' : 's'}
          </span>
        </div>
      </dl>

      <ul className="mt-4 space-y-2">
        {gigPackage.features.length === 0 ? (
          <li className="text-xs italic text-slate-500">No features listed for this tier.</li>
        ) : (
          gigPackage.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-400" />
              <span>{feature}</span>
            </li>
          ))
        )}
      </ul>

      {isSelectable ? (
        <button
          type="button"
          onClick={() => onSelect(gigPackage.tier)}
          aria-pressed={selected}
          className={cn(
            'mt-5 inline-flex min-h-[48px] w-full items-center justify-center rounded-xl px-4 text-sm font-semibold transition-colors',
            selected
              ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
              : 'border border-slate-600 text-slate-200 hover:border-emerald-400 hover:text-emerald-300'
          )}
        >
          {selected ? 'Selected' : `Choose ${PACKAGE_TIER_LABELS[gigPackage.tier]}`}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Three tier package comparison.
 *
 * Below 768px the tiers become a snap-scrolling rail with a full-bleed inset
 * (`-mx-4`) clipped by the parent so the page never scrolls horizontally.
 * From 768px up it resolves to an equal three column grid.
 */
export function PackageTierMatrix({
  packages,
  activeTier,
  onSelectTier,
  readOnly = false,
  className,
  testId,
}: PackageTierMatrixProps): React.JSX.Element {
  return (
    <div data-testid={testId} className={cn('w-full', className)}>
      {/* Mobile: horizontal snap rail. */}
      <div className="overflow-x-clip md:hidden">
        <div
          role="group"
          aria-label="Package tiers"
          data-testid="tier-rail"
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2"
        >
          {PACKAGE_TIERS.map((tier) => (
            <TierColumn
              key={tier}
              gigPackage={packages[tier]}
              selected={activeTier === tier}
              onSelect={onSelectTier}
              readOnly={readOnly}
            />
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-slate-500 md:hidden">Swipe to compare tiers</p>
      </div>

      {/* Tablet + desktop: three column grid. */}
      <div className="hidden gap-4 md:grid md:grid-cols-3" data-testid="tier-grid">
        {PACKAGE_TIERS.map((tier) => (
          <TierColumn
            key={tier}
            gigPackage={packages[tier]}
            selected={activeTier === tier}
            onSelect={onSelectTier}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}