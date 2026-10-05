import { useCallback, useEffect, useState } from 'react';
import { EarningsBreakdownView } from './components/domain/EarningsBreakdownView';
import { GigExplorerGrid } from './components/domain/GigExplorerGrid';
import { OrderManagementQueue } from './components/domain/OrderManagementQueue';
import { SellerDashboardView } from './components/domain/SellerDashboardView';
import { SellerProfileView } from './components/domain/SellerProfileView';
import { AppHeader } from './components/shell/AppHeader';
import { MobileNav } from './components/shell/MobileNav';
import { MarketplaceProvider, useMarketplace } from './context/MarketplaceContext';
import { ToastProvider } from './context/ToastContext';
import {
  DEFAULT_VIEW_BY_MODE,
  isViewAllowedInMode,
  type AppView,
  type SellerMode,
} from './types/marketplace';
import { cn } from './utils/cn';

/**
 * Workspace headings per persona. The same `orders` view is a fulfilment queue
 * for a seller and a purchase tracker for a buyer, so its copy follows the
 * active mode instead of being shared boilerplate.
 */
const VIEW_TITLES: Record<SellerMode, Record<AppView, { title: string; subtitle: string }>> = {
  seller: {
    explorer: {
      title: 'Marketplace',
      subtitle: 'Track how your listings perform against the rest of the marketplace.',
    },
    dashboard: {
      title: 'Seller Management',
      subtitle: 'Performance, tier progression and the live order workflow.',
    },
    orders: {
      title: 'Incoming Orders',
      subtitle: 'Fulfil the orders buyers placed on your gigs, from requirements to delivery.',
    },
    earnings: {
      title: 'Earnings & Payouts',
      subtitle: 'Balances, clearance schedule and the transaction ledger.',
    },
    profile: {
      title: 'Seller Reputation',
      subtitle: 'Your public reputation, listings and local data integrity.',
    },
  },
  buyer: {
    explorer: {
      title: 'Gig Explorer',
      subtitle: 'Search, facet and compare every listing on the marketplace.',
    },
    dashboard: {
      title: 'Seller Management',
      subtitle: 'Seller analytics are only available in seller mode.',
    },
    orders: {
      title: 'My Purchases',
      subtitle: 'Submit requirements, review deliveries and release escrow.',
    },
    earnings: {
      title: 'Earnings & Finances',
      subtitle: 'Seller finances are only available in seller mode.',
    },
    profile: {
      title: 'Buyer Account',
      subtitle: 'Your account, purchase history and local data integrity.',
    },
  },
};

function Workspace(): React.JSX.Element {
  const { sellerMode } = useMarketplace();
  const [activeView, setActiveView] = useState<AppView>(DEFAULT_VIEW_BY_MODE[sellerMode]);

  // Switching persona can strand the user on a workspace the new mode does not
  // own, so the view is redirected to that persona's landing workspace.
  useEffect(() => {
    if (!isViewAllowedInMode(activeView, sellerMode)) {
      setActiveView(DEFAULT_VIEW_BY_MODE[sellerMode]);
    }
  }, [activeView, sellerMode]);

  const navigate = useCallback((view: AppView) => {
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const heading = VIEW_TITLES[sellerMode][activeView];

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
        {activeView === 'dashboard' && sellerMode === 'seller' ? <SellerDashboardView /> : null}
        {activeView === 'orders' ? <OrderManagementQueue /> : null}
        {activeView === 'earnings' && sellerMode === 'seller' ? <EarningsBreakdownView /> : null}
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