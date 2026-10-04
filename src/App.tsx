import { useState } from 'react';
import { Avatar } from './components/primitives/Avatar';
import { Badge, GigStatusBadge, OrderStatusBadge, SellerLevelBadge } from './components/primitives/Badge';
import { Button } from './components/primitives/Button';
import { Input } from './components/primitives/Input';
import { Modal } from './components/primitives/Modal';
import { Select, type SelectOption } from './components/primitives/Select';
import {
  Skeleton,
  SkeletonGrid,
  SkeletonList,
  SkeletonMetricCard,
  SkeletonProfile,
} from './components/primitives/Skeleton';
import { Tabs, type TabItem } from './components/primitives/Tabs';
import { GIG_CATEGORIES, SELLER_LEVELS } from './types/marketplace';
import { cn } from './utils/cn';

const CATEGORY_OPTIONS: SelectOption<(typeof GIG_CATEGORIES)[number]>[] = GIG_CATEGORIES.map((category) => ({
  value: category,
  label: category,
}));

type DensityTab = 'overview' | 'queue' | 'payouts';

const DENSITY_TABS: TabItem<DensityTab>[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'queue', label: 'Queue', badgeCount: 7 },
  { id: 'payouts', label: 'Payouts' },
];

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
 * Phase 2 view: exercises every atomic primitive in all of its states.
 * Replaced by the marketplace shell once the domain layers land.
 */
export default function App(): React.JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [invalidValue, setInvalidValue] = useState('');
  const [category, setCategory] = useState<(typeof GIG_CATEGORIES)[number]>(GIG_CATEGORIES[0]);
  const [activeTab, setActiveTab] = useState<DensityTab>('overview');

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
            Phase 2 · Design Foundation
          </Badge>
        </div>
      </header>

      <main
        className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6 pb-[calc(var(--nav-bottom-height)+24px)] sm:px-6"
        data-testid="design-system-view"
      >
        <Section
          testId="section-button"
          title="Button"
          description="Polymorphic action primitive: variants, sizes, loading state, icon-only and anchor rendering."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button testId="btn-primary">Publish gig</Button>
            <Button variant="secondary" testId="btn-secondary">
              Save draft
            </Button>
            <Button variant="outline" testId="btn-outline">
              Preview
            </Button>
            <Button variant="danger" testId="btn-danger">
              Delete
            </Button>
            <Button variant="ghost" testId="btn-ghost">
              Cancel
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button size="sm" variant="secondary" testId="btn-sm">
              Small
            </Button>
            <Button size="lg" testId="btn-lg">
              Large
            </Button>
            <Button isLoading testId="btn-loading">
              Uploading
            </Button>
            <Button iconOnly aria-label="Notifications" testId="btn-icon">
              N
            </Button>
            <Button as="a" href="#design-system-view" variant="outline" testId="btn-anchor">
              Anchor action
            </Button>
          </div>
        </Section>

        <Section
          testId="section-badge"
          title="Badge"
          description="Seller level, order status and gig lifecycle pills."
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2" data-testid="badge-levels">
              {SELLER_LEVELS.map((level) => (
                <SellerLevelBadge key={level} level={level} size="md" />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2" data-testid="badge-order-statuses">
              <OrderStatusBadge status="pending_requirements" size="md" />
              <OrderStatusBadge status="in_progress" size="md" />
              <OrderStatusBadge status="delivered" size="md" />
              <OrderStatusBadge status="revision" size="md" />
              <OrderStatusBadge status="completed" size="md" />
              <OrderStatusBadge status="cancelled" size="md" />
            </div>
            <div className="flex flex-wrap items-center gap-2" data-testid="badge-gig-statuses">
              <GigStatusBadge status="active" size="md" />
              <GigStatusBadge status="paused" size="md" />
              <GigStatusBadge status="deleted" size="md" />
              <Badge tone="info">Info</Badge>
              <Badge tone="warning">Warning</Badge>
              <Badge tone="danger">Danger</Badge>
            </div>
          </div>
        </Section>

        <Section
          testId="section-avatar"
          title="Avatar"
          description="Responsive sizes, seller level ring, presence dot and monogram fallback on image failure."
        >
          <div className="flex flex-wrap items-center gap-4">
            <Avatar src="" name="Alex Morgan" size="xs" />
            <Avatar src="" name="Nova Studio" size="sm" level="level_one" testId="avatar-monogram-demo" />
            <Avatar src="" name="Kai Motion" size="md" level="level_two" presence="online" testId="avatar-md" />
            <Avatar src="" name="Lumen Audio" size="lg" level="top_rated" />
            <Avatar
              src=""
              name="Pixel Forge"
              size="xl"
              presence="away"
              testId="avatar-fallback"
              className="ring-1 ring-dashed ring-slate-600"
            />
          </div>
        </Section>

        <Section
          testId="section-form"
          title="Input & Select"
          description="Controlled fields with leading icons, inline validation and 48px touch targets."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Search gigs"
              testId="input-search"
              value={searchValue}
              onValueChange={setSearchValue}
              placeholder="Logo design, SEO sprint…"
              leadingIcon={<span aria-hidden="true">⌕</span>}
              trailingSlot={
                searchValue.length > 0 ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearchValue('')}
                    className="inline-flex size-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                  >
                    ✕
                  </button>
                ) : null
              }
              helperText="Search runs after a 300ms debounce."
            />
            <Input
              label="Minimum budget"
              testId="input-error"
              value={invalidValue}
              onValueChange={(value) => {
                setInvalidValue(value);
              }}
              placeholder="e.g. 250"
              error={invalidValue.length > 0 ? 'Budget must be a positive number.' : undefined}
              helperText="Enter whole US dollars."
            />
            <Select
              label="Category"
              testId="select-category"
              value={category}
              onValueChange={setCategory}
              options={CATEGORY_OPTIONS}
              helperText="Filters the explorer grid."
            />
            <Input label="Disabled field" value="" onValueChange={() => undefined} disabled testId="input-disabled" />
          </div>
        </Section>

        <Section
          testId="section-tabs"
          title="Tabs"
          description="Sliding indicator tabs with arrow key navigation and badge counters."
        >
          <Tabs
            items={DENSITY_TABS}
            activeId={activeTab}
            onChange={setActiveTab}
            ariaLabel="Dashboard density"
            testId="tabs-density"
            stretch
          />
          <p className="mt-3 text-sm text-slate-400">
            Selected tab: <span data-testid="active-tab-label">{activeTab}</span>
          </p>
        </Section>

        <Section
          testId="section-modal"
          title="Modal"
          description="Focus trapped dialog that becomes a bottom sheet on mobile."
        >
          <Button testId="open-modal" onClick={() => setIsModalOpen(true)}>
            Open delivery dialog
          </Button>
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Deliver order GH-0001B"
            description="Attach up to 5 files, 100MB total, in an approved format."
            footer={
              <>
                <Button variant="ghost" onClick={() => setIsModalOpen(false)} testId="modal-cancel">
                  Cancel
                </Button>
                <Button onClick={() => setIsModalOpen(false)} testId="modal-confirm">
                  Send delivery
                </Button>
              </>
            }
            testId="delivery-modal"
          >
            <div className="space-y-3 text-sm text-slate-300">
              <p>
                Accepted formats: ZIP, PDF, PNG, JPEG, SVG and MP4. Files are validated locally before the order
                transitions to delivered.
              </p>
              <p className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-xs text-slate-400">
                Modal content is scrollable, focus is trapped, and Escape dismisses the dialog.
              </p>
            </div>
          </Modal>
        </Section>

        <Section
          testId="section-skeleton"
          title="Skeleton"
          description="Pulse loaders matching production card, list and metric geometry."
        >
          <SkeletonProfile />
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonMetricCard key={index} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Skeleton variant="circle" />
            <Skeleton variant="rect" className="max-w-[200px]" />
            <Skeleton variant="text" className="max-w-[140px]" />
          </div>
          <SkeletonGrid count={3} className="mt-4" testId="skeleton-grid" />
          <SkeletonList rows={3} className="mt-4" testId="skeleton-list" />
        </Section>
      </main>

      <div
        aria-hidden="true"
        className={cn('h-[var(--nav-bottom-height)] border-t border-slate-800 bg-slate-900/80')}
      />
    </div>
  );
}