import { useCallback, useState } from 'react';
import { EarningsBreakdownView } from './components/domain/EarningsBreakdownView';
import { GigExplorerGrid } from './components/domain/GigExplorerGrid';
import { OrderManagementQueue } from './components/domain/OrderManagementQueue';
import { SellerDashboardView } from './components/domain/SellerDashboardView';
import { SellerProfileView } from './components/domain/SellerProfileView';
import { AppHeader } from './components/shell/AppHeader';
import { MobileNav } from './components/shell/MobileNav';
import { MarketplaceProvider, useMarketplace } from './context/MarketplaceContext';
import { ToastProvider } from './context/ToastContext';
import type { AppView } from './types/marketplace';
import { cn } from './utils/cn';

const VIEW_TITLES: Record<AppView, { title: string; subtitle: string }> = {
  explorer: {
    title: 'Gig Explorer',
    subtitle: 'Search, facet and compare every listing on the marketplace.',
  },
  dashboard: {
    title: 'Seller Management',
    subtitle: 'Performance, tier progression and the live order workflow.',
  },
  orders: {
    title: 'Order Management',
    subtitle: 'Move orders through requirements, delivery and revisions.',
  },
  earnings: {
    title: 'Earnings & Finances',
    subtitle: 'Balances, clearance schedule and the transaction ledger.',
  },
  profile: {
    title: 'Seller Profile',
    subtitle: 'Your public reputation, listings and local data integrity.',
  },
};

function Workspace(): React.JSX.Element {
  const { sellerMode } = useMarketplace();
  const [activeView, setActiveView] = useState<AppView>('explorer');

  const navigate = useCallback((view: AppView) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const heading = VIEW_TITLES[activeView];

  return (
    <div className="flex min-h-screen flex-col bg-slate-900 text-slate-100" data-testid="app-shell">
      <AppHeader activeView={activeView} onNavigate={navigate} />

      <main
        data-testid="main-content"
        data-active-view={activeView}
        data-seller-mode={sellerMode}
        className={cn(
          'mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6',
          // Reserve the fixed mobile navigation height plus breathing room.
          'pb-[calc(var(--nav-bottom-height)+24px)] md:pb-10'
        )}
      >
        <div className="mb-5">
          <h1 className="text-xl font-bold text-white sm:text-2xl">{heading.title}</h1>
          <p className="mt-1 text-sm text-slate-400">{heading.subtitle}</p>
        </div>

        {activeView === 'explorer' ? (
          <GigExplorerGrid compactSeller={sellerMode === 'buyer'} />
        ) : null}
        {activeView === 'dashboard' ? <SellerDashboardView /> : null}
        {activeView === 'orders' ? (
          <div className="rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4 sm:p-5">
            <OrderManagementQueue title="All orders" />
          </div>
        ) : null}
        {activeView === 'earnings' ? <EarningsBreakdownView /> : null}
        {activeView === 'profile' ? <SellerProfileView /> : null}
      </main>

      <MobileNav activeView={activeView} onNavigate={navigate} />
    </div>
  );
}

/** Application root: providers wrap the responsive marketplace shell. */
export default function App(): React.JSX.Element {
  return (
    <ToastProvider>
      <MarketplaceProvider>
        <Workspace />
      </MarketplaceProvider>
    </ToastProvider>
  );
}