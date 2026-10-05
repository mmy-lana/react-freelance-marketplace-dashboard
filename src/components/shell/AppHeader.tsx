import {
  Bell,
  CreditCard,
  LayoutDashboard,
  Package,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  Store,
  User,
  Wallet,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../primitives/Avatar';
import { Badge, SellerLevelBadge } from '../primitives/Badge';
import { Input } from '../primitives/Input';
import { useMarketplace } from '../../context/MarketplaceContext';
import {
  SELLER_LEVEL_LABELS,
  type AppView,
  type NotificationKind,
  type SellerMode,
} from '../../types/marketplace';
import { cn } from '../../utils/cn';
import { formatRelativeTime } from '../../utils/date';

export interface AppHeaderProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  className?: string;
}

const NAV_ITEMS: Record<SellerMode, { id: AppView; label: string }[]> = {
  seller: [
    { id: 'explorer', label: 'Marketplace' },
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'orders', label: 'Orders' },
    { id: 'earnings', label: 'Earnings' },
    { id: 'profile', label: 'Profile' },
  ],
  buyer: [
    { id: 'explorer', label: 'Explorer' },
    { id: 'orders', label: 'Purchases' },
    { id: 'profile', label: 'Account' },
  ],
};

/**
 * Notification kinds map to vector primitives rather than emoji: emoji render
 * differently per platform, ignore `currentColor` and cannot be sized or
 * labelled consistently across the design system.
 */
const NOTIFICATION_ICONS: Record<NotificationKind, typeof Package> = {
  order: Package,
  revision: RotateCcw,
  payout: CreditCard,
  system: Sparkles,
};

const MODE_OPTIONS: { id: SellerMode; label: string }[] = [
  { id: 'seller', label: 'Seller' },
  { id: 'buyer', label: 'Buyer' },
];

/**
 * Sticky application header: brand, desktop navigation, debounced search,
 * notifications popover, seller/buyer mode switcher and the seller identity.
 */
export function AppHeader({ activeView, onNavigate, className }: AppHeaderProps): React.JSX.Element {
  const {
    currentUser,
    filters,
    setFilters,
    notifications,
    unreadNotificationCount,
    markNotificationsRead,
    sellerMode,
    setSellerMode,
  } = useMarketplace();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // The navigation is a projection of the active persona, not a static menu.
  const navItems = NAV_ITEMS[sellerMode];
  const isSellerMode = sellerMode === 'seller';

  useEffect(() => {
    if (!isNotificationsOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent): void => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isNotificationsOpen]);

  return (
    <header
      data-testid="app-header"
      className={cn(
        'sticky top-0 z-50 border-b border-slate-800 bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-slate-900/80',
        className
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <button
          type="button"
          onClick={() => onNavigate('explorer')}
          data-testid="brand-home"
          className="flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg pr-1"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500 text-lg font-bold text-slate-950">
            F
          </span>
          <span className="text-lg font-bold tracking-tight text-white">GigHub</span>
        </button>

        <nav aria-label="Primary" data-testid="header-nav" className="hidden min-w-0 md:block">
          <ul className="flex items-center gap-0.5 lg:gap-1" data-nav-mode={sellerMode}>
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={activeView === item.id ? 'page' : undefined}
                  data-testid={`nav-${item.id}`}
                  className={cn(
                    'inline-flex min-h-[44px] items-center rounded-lg px-2.5 text-[13px] font-medium transition-colors lg:px-3 lg:text-sm',
                    activeView === item.id ? 'bg-slate-800 text-emerald-300' : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                  )}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 md:flex-none">
          <div className="hidden w-full max-w-xs lg:block">
            <Input
              label="Search gigs"
              hideLabel
              size="sm"
              testId="header-search"
              value={filters.searchQuery}
              onValueChange={(searchQuery) => setFilters((previous) => ({ ...previous, searchQuery }))}
              placeholder="Search gigs…"
              leadingIcon={<Search aria-hidden="true" className="size-4" />}
            />
          </div>

          <div
            ref={popoverRef}
            className="relative"
            data-testid="notifications"
          >
            <button
              type="button"
              aria-expanded={isNotificationsOpen}
              aria-haspopup="dialog"
              aria-label={`Notifications (${unreadNotificationCount} unread)`}
              data-testid="notifications-button"
              onClick={() => setIsNotificationsOpen((open) => !open)}
              className="relative inline-flex size-11 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
            >
              <Bell aria-hidden="true" className="size-5" />
              {unreadNotificationCount > 0 ? (
                <span
                  data-testid="notifications-count"
                  className="tabular absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-slate-950"
                >
                  {unreadNotificationCount}
                </span>
              ) : null}
            </button>

            {isNotificationsOpen ? (
              <div
                role="dialog"
                aria-label="Notifications"
                data-testid="notifications-popover"
                className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] animate-fade-in rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/60"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
                  <h2 className="text-sm font-semibold text-white">Notifications</h2>
                  <button
                    type="button"
                    onClick={markNotificationsRead}
                    data-testid="notifications-mark-read"
                    className="inline-flex min-h-[44px] items-center rounded-lg px-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/10"
                  >
                    Mark all read
                  </button>
                </div>
                <ul className="max-h-80 overflow-y-auto" data-testid="notifications-list">
                  {notifications.length === 0 ? (
                    <li className="px-4 py-8 text-center text-xs text-slate-500">You are all caught up.</li>
                  ) : (
                    notifications.map((notification) => (
                      <li
                        key={notification.id}
                        data-testid="notification-item"
                        data-read={notification.isRead ? 'true' : 'false'}
                        className={cn(
                          'flex gap-3 border-b border-slate-800/70 px-4 py-3 last:border-b-0',
                          notification.isRead ? 'opacity-70' : 'bg-emerald-500/5'
                        )}
                      >
                        <span
                          aria-hidden="true"
                          data-testid="notification-icon"
                          data-notification-kind={notification.kind}
                          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300"
                        >
                          {(() => {
                            const Icon = NOTIFICATION_ICONS[notification.kind];
                            return <Icon className="size-4" />;
                          })()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-100">{notification.title}</p>
                          <p className="line-clamp-2 text-xs text-slate-400">{notification.body}</p>
                          <p className="mt-1 text-[11px] text-slate-500">{formatRelativeTime(notification.createdAt)}</p>
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center rounded-lg border border-slate-700 p-0.5" role="group" aria-label="Marketplace mode">
            {MODE_OPTIONS.map((mode) => (
              <button
                key={mode.id}
                type="button"
                aria-pressed={sellerMode === mode.id}
                aria-label={`${mode.label} mode`}
                data-testid={`mode-${mode.id}`}
                data-mode-active={sellerMode === mode.id ? 'true' : 'false'}
                onClick={() => setSellerMode(mode.id)}
                className={cn(
                  // 44px keeps the switcher a valid touch target on phones, where
                  // it is the only way to change persona.
                  'inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-colors lg:px-3',
                  sellerMode === mode.id ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {mode.id === 'seller' ? (
                  <Store aria-hidden="true" className="size-3.5" />
                ) : (
                  <User aria-hidden="true" className="size-3.5" />
                )}
                <span className="hidden lg:inline">{mode.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onNavigate('profile')}
            data-testid="seller-avatar"
            aria-label={`Open ${currentUser.displayName} profile`}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-1"
          >
            <Avatar src={currentUser.avatarUrl} name={currentUser.displayName} size="sm" level={currentUser.level} presence="online" />
            <span className="hidden min-w-0 text-left lg:block">
              <span className="block max-w-[9rem] truncate text-sm font-medium text-slate-100">
                {currentUser.displayName}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                {SELLER_LEVEL_LABELS[currentUser.level]}
                <span aria-hidden="true">·</span>
                <Star aria-hidden="true" className="size-3 fill-current" />
                <span className="tabular">{currentUser.rating.toFixed(2)}</span>
              </span>
            </span>
          </button>
        </div>
      </div>

      {isSellerMode ? (
        <div className="mx-auto hidden max-w-7xl items-center justify-between gap-3 border-t border-slate-800/70 px-4 py-2 sm:px-6 lg:flex">
          <div className="flex items-center gap-2">
            <SellerLevelBadge level={currentUser.level} size="md" />
            <Badge tone="neutral" size="md">
              {currentUser.country}
            </Badge>
          </div>
          <nav aria-label="Quick links" className="flex items-center gap-1">
            {[
              { id: 'dashboard' as AppView, label: 'Analytics', icon: LayoutDashboard },
              { id: 'earnings' as AppView, label: 'Payouts', icon: Wallet },
            ].map((quick) => (
              <button
                key={quick.id}
                type="button"
                onClick={() => onNavigate(quick.id)}
                data-testid={`quick-${quick.id}`}
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
              >
                <quick.icon aria-hidden="true" className="size-3.5" />
                {quick.label}
              </button>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}