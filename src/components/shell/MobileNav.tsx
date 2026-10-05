import { Compass, Receipt, User, Wallet } from 'lucide-react';
import { useMemo } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import type { AppView, SellerMode } from '../../types/marketplace';
import { cn } from '../../utils/cn';

export interface MobileNavProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  className?: string;
}

const ACTIVE_STATUSES = ['pending_requirements', 'in_progress', 'delivered', 'revision'] as const;

const NAV_ENTRIES: Record<SellerMode, { id: AppView; label: string; icon: typeof Compass }[]> = {
  seller: [
    { id: 'explorer', label: 'Marketplace', icon: Compass },
    { id: 'orders', label: 'Orders', icon: Receipt },
    { id: 'earnings', label: 'Earnings', icon: Wallet },
    { id: 'profile', label: 'Profile', icon: User },
  ],
  buyer: [
    { id: 'explorer', label: 'Explorer', icon: Compass },
    { id: 'orders', label: 'Purchases', icon: Receipt },
    { id: 'profile', label: 'Account', icon: User },
  ],
};

/**
 * Fixed bottom navigation rendered below 768px.
 *
 * Entries and the active-order badge follow the active persona, so a buyer
 * never sees an earnings destination they cannot open. Height is bound to
 * `--nav-bottom-height` (56px) and the main column reserves the same space, so
 * content is never hidden underneath the bar.
 */
export function MobileNav({ activeView, onNavigate, className }: MobileNavProps): React.JSX.Element {
  const { sellerMode, sellerOrders, buyerOrders } = useMarketplace();

  // The badge counts only the orders the current persona is responsible for.
  const activeOrderCount = useMemo(() => {
    const scoped = sellerMode === 'seller' ? sellerOrders : buyerOrders;
    return scoped.filter((order) => (ACTIVE_STATUSES as readonly string[]).includes(order.status)).length;
  }, [sellerMode, sellerOrders, buyerOrders]);

  const entries = NAV_ENTRIES[sellerMode];

  return (
    <nav
      aria-label="Primary"
      data-testid="mobile-nav"
      data-nav-mode={sellerMode}
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-900/95 backdrop-blur md:hidden',
        className
      )}
      style={{ height: 'var(--nav-bottom-height)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex h-full max-w-lg items-stretch justify-around px-2" data-testid="mobile-nav-entries">
        {entries.map((entry) => {
          const isActive = activeView === entry.id;
          const badge = entry.id === 'orders' ? activeOrderCount : 0;
          return (
            <li key={entry.id} className="flex-1">
              <button
                type="button"
                onClick={() => onNavigate(entry.id)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={badge > 0 ? `${entry.label}, ${badge} active orders` : entry.label}
                data-testid={`mobile-nav-${entry.id}`}
                className={cn(
                  'flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[11px] font-medium transition-colors',
                  isActive ? 'text-emerald-400' : 'text-slate-400'
                )}
              >
                <span className="relative">
                  <entry.icon aria-hidden="true" className="size-5" />
                  {badge > 0 ? (
                    <span className="tabular absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-slate-950">
                      {badge}
                    </span>
                  ) : null}
                </span>
                <span className="max-w-full truncate">{entry.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}