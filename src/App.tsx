import { useState } from 'react';
import { GigExplorerGrid } from './components/domain/GigExplorerGrid';
import { SellerDashboardView } from './components/domain/SellerDashboardView';
import { Tabs, type TabItem } from './components/primitives/Tabs';
import { Badge } from './components/primitives/Badge';
import { MarketplaceProvider, useMarketplace } from './context/MarketplaceContext';
import { ToastProvider } from './context/ToastContext';

type WorkspaceTab = 'explorer' | 'dashboard';

const WORKSPACE_TABS: TabItem<WorkspaceTab>[] = [
  { id: 'explorer', label: 'Gig Explorer' },
  { id: 'dashboard', label: 'Seller Dashboard' },
];

function Workspace(): React.JSX.Element {
  const { orders, gigs, hydrationSource, unreadNotificationCount } = useMarketplace();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('explorer');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100" data-testid="app-shell">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500 text-lg font-bold text-slate-950">
              F
            </span>
            <span className="text-lg font-bold tracking-tight text-white">GigHub</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand" testId="phase-badge">
              Phase 4 · Domain Logic
            </Badge>
            <Badge tone="neutral" size="md" testId="hydration-badge">
              storage: {hydrationSource}
            </Badge>
            <Badge tone={unreadNotificationCount > 0 ? 'warning' : 'neutral'} size="md">
              {unreadNotificationCount} unread
            </Badge>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 pb-[calc(var(--nav-bottom-height)+24px)] sm:px-6">
        <Tabs
          items={WORKSPACE_TABS}
          activeId={activeTab}
          onChange={setActiveTab}
          ariaLabel="Workspace"
          testId="workspace-tabs"
        />

        <p className="text-xs text-slate-500" data-testid="dataset-summary">
          {gigs.length} gigs · {orders.length} orders loaded
        </p>

        {activeTab === 'explorer' ? <GigExplorerGrid /> : <SellerDashboardView />}
      </main>

      <div aria-hidden="true" className="h-[var(--nav-bottom-height)]" />
    </div>
  );
}

/**
 * Phase 4 composition: providers wrap a two-tab workspace so the reactive
 * domain layer can be exercised end to end.
 */
export default function App(): React.JSX.Element {
  return (
    <ToastProvider>
      <MarketplaceProvider>
        <Workspace />
      </MarketplaceProvider>
    </ToastProvider>
  );
}