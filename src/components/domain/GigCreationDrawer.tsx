import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { useToast } from '../../context/ToastContext';
import {
  GIG_CATEGORIES,
  PACKAGE_TIERS,
  PACKAGE_TIER_LABELS,
  type CreateGigInput,
  type GigCategory,
  type GigItem,
  type GigPackage,
  type PackageTier,
} from '../../types/marketplace';
import { cn } from '../../utils/cn';
import { formatCentsToUsd, parseUsdInputToCents } from '../../utils/currency';
import { slugify } from '../../utils/id';
import { createGigPlaceholderImages } from '../../utils/seedData';

type StepId = 'basics' | 'packages' | 'review';
const STEPS: { id: StepId; title: string; description: string }[] = [
  { id: 'basics', title: 'Gig basics', description: 'What are you offering?' },
  { id: 'packages', title: 'Packages', description: 'Price, delivery and revisions per tier.' },
  { id: 'review', title: 'Review', description: 'Confirm everything before publishing.' },
];

interface PackageDraft {
  title: string;
  description: string;
  price: string;
  deliveryDays: string;
  revisions: string;
  features: string;
}

type PackageDrafts = Record<PackageTier, PackageDraft>;

const EMPTY_DRAFT: PackageDraft = {
  title: '',
  description: '',
  price: '',
  deliveryDays: '',
  revisions: '',
  features: '',
};

function createEmptyDrafts(): PackageDrafts {
  return {
    basic: { ...EMPTY_DRAFT, title: 'Basic', deliveryDays: '3', revisions: '1' },
    standard: { ...EMPTY_DRAFT, title: 'Standard', deliveryDays: '7', revisions: '2' },
    premium: { ...EMPTY_DRAFT, title: 'Premium', deliveryDays: '14', revisions: '3' },
  };
}

function parseFeatures(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 12);
}

export interface GigCreationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  /** Fired after the gig is persisted so the host view can refresh selection. */
  onCreated?: (gig: GigItem) => void;
}

/**
 * Multi-step gig configurator.
 *
 * Step 1 captures the listing basics, step 2 the three package tiers and step 3
 * a review panel. Submission runs through `createNewGig`, which performs the
 * optimistic insert + persistence rollback inside the marketplace context.
 */
export function GigCreationDrawer({ isOpen, onClose, onCreated }: GigCreationDrawerProps): React.JSX.Element {
  const { createNewGig } = useMarketplace();
  const { pushToast } = useToast();

  const [stepIndex, setStepIndex] = useState(0);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<GigCategory>(GIG_CATEGORIES[0]);
  const [subcategory, setSubcategory] = useState('');
  const [summary, setSummary] = useState('');
  const [drafts, setDrafts] = useState<PackageDrafts>(createEmptyDrafts);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStepIndex(0);
      setTitle('');
      setCategory(GIG_CATEGORIES[0]);
      setSubcategory('');
      setSummary('');
      setDrafts(createEmptyDrafts());
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const updateDraft = (tier: PackageTier, patch: Partial<PackageDraft>): void => {
    setDrafts((previous) => ({ ...previous, [tier]: { ...previous[tier], ...patch } }));
  };

  const validateBasics = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (title.trim().length < 15) {
      nextErrors.title = 'Use at least 15 characters so buyers understand the offer.';
    }
    if (subcategory.trim().length === 0) {
      nextErrors.subcategory = 'Add a subcategory (e.g. Logo Design).';
    }
    if (summary.trim().length < 30) {
      nextErrors.summary = 'Describe the outcome in at least 30 characters.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const packagePriceCents = useMemo(() => {
    const prices: Record<PackageTier, number | null> = {
      basic: parseUsdInputToCents(drafts.basic.price),
      standard: parseUsdInputToCents(drafts.standard.price),
      premium: parseUsdInputToCents(drafts.premium.price),
    };
    return prices;
  }, [drafts]);

  const validatePackages = (): boolean => {
    const nextErrors: Record<string, string> = {};

    PACKAGE_TIERS.forEach((tier) => {
      const draft = drafts[tier];
      const priceCents = packagePriceCents[tier];

      if (draft.title.trim().length === 0) {
        nextErrors[`${tier}.title`] = `${PACKAGE_TIER_LABELS[tier]} needs a package name.`;
      }
      if (priceCents === null || priceCents <= 0) {
        nextErrors[`${tier}.price`] = `${PACKAGE_TIER_LABELS[tier]} needs a price above $0.`;
      }
      const deliveryDays = Number.parseInt(draft.deliveryDays, 10);
      if (!Number.isFinite(deliveryDays) || deliveryDays < 1) {
        nextErrors[`${tier}.deliveryDays`] = 'Delivery must be at least one day.';
      }
      const revisions = Number.parseInt(draft.revisions, 10);
      if (!Number.isFinite(revisions) || revisions < 0) {
        nextErrors[`${tier}.revisions`] = 'Revisions cannot be negative.';
      }
      if (parseFeatures(draft.features).length === 0) {
        nextErrors[`${tier}.features`] = 'List at least one feature, one per line.';
      }
    });

    const { basic, standard, premium } = packagePriceCents;
    if (basic !== null && standard !== null && premium !== null) {
      if (basic > 0 && standard > 0 && standard < basic) {
        nextErrors.standardPrice = 'Standard must be priced above Basic.';
      }
      if (premium > 0 && standard > 0 && premium < standard) {
        nextErrors.premiumPrice = 'Premium must be priced above Standard.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const buildPayload = (): CreateGigInput => {
    const packages = {} as Record<PackageTier, GigPackage>;

    PACKAGE_TIERS.forEach((tier) => {
      const draft = drafts[tier];
      const priceCents = packagePriceCents[tier] ?? 0;
      packages[tier] = {
        id: `${tier}-pending`,
        tier,
        title: draft.title.trim(),
        description: draft.description.trim(),
        deliveryDays: Math.max(1, Number.parseInt(draft.deliveryDays, 10) || 1),
        revisions: Math.max(0, Number.parseInt(draft.revisions, 10) || 0),
        priceCents,
        features: parseFeatures(draft.features),
      };
    });

    const images = createGigPlaceholderImages(title.trim(), category);

    return {
      title: title.trim(),
      slug: slugify(title, 'gig'),
      category,
      subcategory: subcategory.trim(),
      thumbnailUrl: images[0],
      images,
      startingPriceCents: packages.basic.priceCents,
      packages,
      rating: 0,
      reviewCount: 0,
      status: 'active',
      impressionsCount: 0,
      clicksCount: 0,
      ordersInQueueCount: 0,
    };
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validatePackages()) {
      setStepIndex(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await createNewGig(buildPayload());
      onCreated?.(created);
      onClose();
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'Publishing failed',
        description: error instanceof Error ? error.message : 'The gig could not be saved.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentStep = STEPS[stepIndex];

  return (
    <div
      data-testid="gig-creation-drawer"
      className="flex h-full flex-col bg-slate-900"
      role="dialog"
      aria-modal="true"
      aria-label="Create a new gig"
    >
      <header className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-white">Create a gig</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Step {stepIndex + 1} of {STEPS.length} · {currentStep.title}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close gig creation"
          data-testid="gig-creation-close"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
        >
          <ChevronRight aria-hidden="true" className="size-5 rotate-45" />
        </button>
      </header>

      <ol className="flex gap-2 border-b border-slate-800 px-5 py-3" aria-label="Gig creation steps">
        {STEPS.map((step, index) => (
          <li key={step.id} className="flex-1">
            <button
              type="button"
              onClick={() => (index < stepIndex ? setStepIndex(index) : undefined)}
              disabled={index > stepIndex}
              aria-current={index === stepIndex ? 'step' : undefined}
              className={cn(
                'flex w-full min-h-[44px] flex-col items-start justify-center rounded-lg border px-3 py-1.5 text-left transition-colors',
                index === stepIndex
                  ? 'border-emerald-400/60 bg-emerald-500/10'
                  : index < stepIndex
                    ? 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
                    : 'cursor-not-allowed border-slate-800 bg-slate-900/40'
              )}
            >
              <span className="text-[11px] uppercase tracking-wide text-slate-500">Step {index + 1}</span>
              <span className="truncate text-xs font-medium text-slate-200">{step.title}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {stepIndex === 0 ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="gig-title" className="mb-1.5 block text-sm font-medium text-slate-300">
                Gig title *
              </label>
              <input
                id="gig-title"
                data-testid="gig-title-input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="I will design a responsive landing page"
                className={cn(
                  'min-h-[48px] w-full rounded-xl border bg-slate-900/70 px-3.5 text-slate-100 placeholder:text-slate-500',
                  errors.title ? 'border-rose-500/70' : 'border-slate-700'
                )}
              />
              <p className={cn('mt-1.5 text-xs', errors.title ? 'text-rose-300' : 'text-slate-500')}>
                {errors.title ?? `${title.trim().length}/15 characters minimum`}
              </p>
            </div>

            <div>
              <label htmlFor="gig-category" className="mb-1.5 block text-sm font-medium text-slate-300">
                Category *
              </label>
              <select
                id="gig-category"
                data-testid="gig-category-input"
                value={category}
                onChange={(event) => setCategory(event.target.value as GigCategory)}
                className="min-h-[48px] w-full rounded-xl border border-slate-700 bg-slate-900/70 px-3.5 text-slate-100"
              >
                {GIG_CATEGORIES.map((entry) => (
                  <option key={entry} value={entry} className="bg-slate-900">
                    {entry}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="gig-subcategory" className="mb-1.5 block text-sm font-medium text-slate-300">
                Subcategory *
              </label>
              <input
                id="gig-subcategory"
                data-testid="gig-subcategory-input"
                value={subcategory}
                onChange={(event) => setSubcategory(event.target.value)}
                placeholder="Landing Pages"
                className={cn(
                  'min-h-[48px] w-full rounded-xl border bg-slate-900/70 px-3.5 text-slate-100 placeholder:text-slate-500',
                  errors.subcategory ? 'border-rose-500/70' : 'border-slate-700'
                )}
              />
              {errors.subcategory ? <p className="mt-1.5 text-xs text-rose-300">{errors.subcategory}</p> : null}
            </div>

            <div>
              <label htmlFor="gig-summary" className="mb-1.5 block text-sm font-medium text-slate-300">
                What will the buyer receive? *
              </label>
              <textarea
                id="gig-summary"
                data-testid="gig-summary-input"
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                rows={4}
                placeholder="Describe the deliverable, the process and what makes your work different."
                className={cn(
                  'w-full rounded-xl border bg-slate-900/70 px-3.5 py-3 text-slate-100 placeholder:text-slate-500',
                  errors.summary ? 'border-rose-500/70' : 'border-slate-700'
                )}
              />
              {errors.summary ? <p className="mt-1.5 text-xs text-rose-300">{errors.summary}</p> : null}
            </div>
          </div>
        ) : null}

        {stepIndex === 1 ? (
          <div className="space-y-5">
            {PACKAGE_TIERS.map((tier) => (
              <fieldset key={tier} className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4">
                <legend className="px-1 text-sm font-semibold text-white">{PACKAGE_TIER_LABELS[tier]}</legend>

                <div className="space-y-3">
                  <div>
                    <label htmlFor={`pkg-${tier}-title`} className="mb-1.5 block text-xs font-medium text-slate-300">
                      Package name *
                    </label>
                    <input
                      id={`pkg-${tier}-title`}
                      data-testid={`pkg-${tier}-title`}
                      value={drafts[tier].title}
                      onChange={(event) => updateDraft(tier, { title: event.target.value })}
                      className={cn(
                        'min-h-[44px] w-full rounded-lg border bg-slate-900/70 px-3 text-sm text-slate-100',
                        errors[`${tier}.title`] ? 'border-rose-500/70' : 'border-slate-700'
                      )}
                    />
                    {errors[`${tier}.title`] ? (
                      <p className="mt-1 text-xs text-rose-300">{errors[`${tier}.title`]}</p>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label htmlFor={`pkg-${tier}-price`} className="mb-1.5 block text-xs font-medium text-slate-300">
                        Price (USD) *
                      </label>
                      <input
                        id={`pkg-${tier}-price`}
                        data-testid={`pkg-${tier}-price`}
                        inputMode="decimal"
                        value={drafts[tier].price}
                        onChange={(event) => updateDraft(tier, { price: event.target.value })}
                        placeholder="50"
                        className={cn(
                          'min-h-[44px] w-full rounded-lg border bg-slate-900/70 px-3 text-sm text-slate-100',
                          errors[`${tier}.price`] ? 'border-rose-500/70' : 'border-slate-700'
                        )}
                      />
                    </div>
                    <div>
                      <label htmlFor={`pkg-${tier}-days`} className="mb-1.5 block text-xs font-medium text-slate-300">
                        Days *
                      </label>
                      <input
                        id={`pkg-${tier}-days`}
                        data-testid={`pkg-${tier}-days`}
                        inputMode="numeric"
                        value={drafts[tier].deliveryDays}
                        onChange={(event) => updateDraft(tier, { deliveryDays: event.target.value })}
                        className={cn(
                          'min-h-[44px] w-full rounded-lg border bg-slate-900/70 px-3 text-sm text-slate-100',
                          errors[`${tier}.deliveryDays`] ? 'border-rose-500/70' : 'border-slate-700'
                        )}
                      />
                    </div>
                    <div>
                      <label htmlFor={`pkg-${tier}-revisions`} className="mb-1.5 block text-xs font-medium text-slate-300">
                        Revisions *
                      </label>
                      <input
                        id={`pkg-${tier}-revisions`}
                        data-testid={`pkg-${tier}-revisions`}
                        inputMode="numeric"
                        value={drafts[tier].revisions}
                        onChange={(event) => updateDraft(tier, { revisions: event.target.value })}
                        className={cn(
                          'min-h-[44px] w-full rounded-lg border bg-slate-900/70 px-3 text-sm text-slate-100',
                          errors[`${tier}.revisions`] ? 'border-rose-500/70' : 'border-slate-700'
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor={`pkg-${tier}-description`} className="mb-1.5 block text-xs font-medium text-slate-300">
                      Description
                    </label>
                    <input
                      id={`pkg-${tier}-description`}
                      value={drafts[tier].description}
                      onChange={(event) => updateDraft(tier, { description: event.target.value })}
                      placeholder="One line describing this tier."
                      className="min-h-[44px] w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 text-sm text-slate-100"
                    />
                  </div>

                  <div>
                    <label htmlFor={`pkg-${tier}-features`} className="mb-1.5 block text-xs font-medium text-slate-300">
                      Features (one per line) *
                    </label>
                    <textarea
                      id={`pkg-${tier}-features`}
                      data-testid={`pkg-${tier}-features`}
                      value={drafts[tier].features}
                      onChange={(event) => updateDraft(tier, { features: event.target.value })}
                      rows={4}
                      placeholder={'Source files\n2 revision rounds\n24h response'}
                      className={cn(
                        'w-full rounded-lg border bg-slate-900/70 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500',
                        errors[`${tier}.features`] ? 'border-rose-500/70' : 'border-slate-700'
                      )}
                    />
                    {errors[`${tier}.features`] ? (
                      <p className="mt-1 text-xs text-rose-300">{errors[`${tier}.features`]}</p>
                    ) : null}
                  </div>
                </div>
              </fieldset>
            ))}

            {errors.standardPrice || errors.premiumPrice ? (
              <p role="alert" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                {errors.standardPrice ?? errors.premiumPrice}
              </p>
            ) : null}
          </div>
        ) : null}

        {stepIndex === 2 ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Listing</p>
              <p className="mt-1 text-sm font-semibold text-white">{title.trim() || 'Untitled gig'}</p>
              <p className="mt-1 text-xs text-slate-400">
                {category} · {subcategory.trim() || 'No subcategory'}
              </p>
              <p className="mt-3 text-sm text-slate-300">{summary.trim() || 'No description provided.'}</p>
            </div>

            <ul className="space-y-2">
              {PACKAGE_TIERS.map((tier) => (
                <li
                  key={tier}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/70 bg-slate-800/40 px-4 py-3"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Check aria-hidden="true" className="size-4 shrink-0 text-emerald-400" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-200">
                        {PACKAGE_TIER_LABELS[tier]} · {drafts[tier].title.trim() || 'Untitled tier'}
                      </span>
                      <span className="tabular block text-xs text-slate-500">
                        {drafts[tier].deliveryDays || '0'} days · {drafts[tier].revisions || '0'} revisions ·{' '}
                        {parseFeatures(drafts[tier].features).length} features
                      </span>
                    </span>
                  </span>
                  <span className="tabular shrink-0 text-sm font-semibold text-white">
                    {formatCentsToUsd(packagePriceCents[tier] ?? 0)}
                  </span>
                </li>
              ))}
            </ul>

            <p className="flex items-start gap-2 rounded-xl border border-sky-400/30 bg-sky-400/10 px-3 py-2 text-xs text-sky-100">
              <Sparkles aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              The gig is inserted optimistically and rolled back automatically if local persistence fails.
            </p>
          </div>
        ) : null}
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-slate-800 px-5 py-4">
        <button
          type="button"
          onClick={() => setStepIndex((previous) => Math.max(0, previous - 1))}
          disabled={stepIndex === 0}
          className="inline-flex min-h-[48px] items-center gap-1 rounded-xl border border-slate-600 px-4 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 disabled:opacity-40"
        >
          <ChevronLeft aria-hidden="true" className="size-4" />
          Back
        </button>

        {stepIndex < STEPS.length - 1 ? (
          <button
            type="button"
            data-testid="gig-creation-next"
            onClick={() => {
              if (stepIndex === 0 && !validateBasics()) {
                return;
              }
              if (stepIndex === 1 && !validatePackages()) {
                return;
              }
              setStepIndex((previous) => Math.min(STEPS.length - 1, previous + 1));
            }}
            className="inline-flex min-h-[48px] items-center gap-1 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
          >
            Continue
            <ChevronRight aria-hidden="true" className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            data-testid="gig-creation-submit"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
            {isSubmitting ? 'Publishing…' : 'Publish gig'}
          </button>
        )}
      </footer>
    </div>
  );
}