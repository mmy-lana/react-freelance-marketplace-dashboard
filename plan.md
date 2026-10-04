# Architectural Specification: React Freelance Marketplace Dashboard

## 1. Data Schema & Pure TypeScript Interfaces

```typescript
export type SellerLevel = 'new_seller' | 'level_one' | 'level_two' | 'top_rated';

export type GigCategory =
  | 'Graphics & Design'
  | 'Digital Marketing'
  | 'Writing & Translation'
  | 'Video & Animation'
  | 'Music & Audio'
  | 'Programming & Tech'
  | 'AI Services';

export type OrderStatus =
  | 'pending_requirements'
  | 'in_progress'
  | 'delivered'
  | 'revision'
  | 'completed'
  | 'cancelled';

export type PackageTier = 'basic' | 'standard' | 'premium';

export interface SellerSnippet {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  level: SellerLevel;
  rating: number;
  ratingCount: number;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  title: string;
  level: SellerLevel;
  rating: number;
  ratingCount: number;
  completedOrdersCount: number;
  country: string;
  memberSince: string;
  responseRatePercent: number;
  responseTimeHours: number;
  onTimeDeliveryPercent: number;
  orderCompletionPercent: number;
  totalEarnedCents: number;
  availableBalanceCents: number;
  pendingClearanceCents: number;
}

export interface GigPackage {
  id: string;
  tier: PackageTier;
  title: string;
  description: string;
  deliveryDays: number;
  revisions: number;
  priceCents: number;
  features: string[];
}

export interface GigItem {
  id: string;
  sellerId: string;
  seller: SellerSnippet;
  title: string;
  slug: string;
  category: GigCategory;
  subcategory: string;
  thumbnailUrl: string;
  images: string[];
  startingPriceCents: number;
  packages: Record<PackageTier, GigPackage>;
  rating: number;
  reviewCount: number;
  status: 'active' | 'paused' | 'deleted';
  impressionsCount: number;
  clicksCount: number;
  ordersInQueueCount: number;
  createdAt: string;
  updatedAt: string;
}

export type CreateGigInput = Omit<
  GigItem,
  'id' | 'createdAt' | 'updatedAt' | 'sellerId' | 'seller'
>;

export interface OrderMilestone {
  id: string;
  title: string;
  dueDate: string;
  isCompleted: boolean;
}

export interface OrderRequirement {
  id: string;
  question: string;
  answerText?: string;
  isAnswered: boolean;
}

export interface OrderDeliveryFile {
  name: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
}

export const DELIVERY_CONSTRAINTS = {
  maxFiles: 5,
  maxSizeBytes: 104857600, // 100 MB
  allowedMimeTypes: [
    'application/zip',
    'application/x-zip-compressed',
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/svg+xml',
    'video/mp4',
  ],
} as const;

// Note: ORDER_STATUS_TRANSITIONS must be collocated with OrderStatus or explicitly import OrderStatus from the types module
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_requirements: ['in_progress', 'cancelled'],
  in_progress: ['delivered', 'cancelled'],
  delivered: ['completed', 'revision'],
  revision: ['delivered', 'cancelled'],
  completed: [],
  cancelled: [],
} as const;

export interface OrderItem {
  id: string;
  orderNumber: string;
  gigId: string;
  gigTitle: string;
  gigThumbnailUrl: string;
  buyerId: string;
  buyerUsername: string;
  buyerAvatarUrl: string;
  sellerId: string;
  tier: PackageTier;
  status: OrderStatus;
  amountCents: number;
  serviceFeeCents: number;
  netRevenueCents: number;
  startDate: string;
  dueDate: string;
  deliveredAt?: string;
  completedAt?: string;
  requirements: OrderRequirement[];
  milestones: OrderMilestone[];
  deliveryFiles: OrderDeliveryFile[];
  revisionCountTotal: number;
  revisionCountRemaining: number;
  createdAt: string;
  updatedAt: string;
}

export interface GigFilterState {
  searchQuery: string;
  category: GigCategory | 'All';
  minBudget: number;
  maxBudget: number;
  deliveryMaxDays: number;
  sellerLevels: SellerLevel[];
  sortBy: 'relevance' | 'rating' | 'price_asc' | 'price_desc' | 'orders_count';
}

export interface SellerMetricBreakdown {
  period: 'last_7_days' | 'last_30_days' | 'last_90_days' | 'year_to_date';
  grossVolumeCents: number;
  completedOrdersCount: number;
  averageSellingPriceCents: number;
  profileVisitsCount: number;
  conversionRatePercent: number;
}
```

---

## 2. Component Architecture

```
src/
├── components/
│   ├── primitives/
│   │   ├── Button.tsx                  # Polymorphic accessible action primitive
│   │   ├── Badge.tsx                   # Tag, status, and seller level badge
│   │   ├── Avatar.tsx                  # Rounded avatar with fallback initials & status ring
│   │   ├── Input.tsx                   # Controlled text/search field with leading icons
│   │   ├── Select.tsx                  # Dropdown selector with touch targets
│   │   ├── Modal.tsx                   # Accessible modal dialog with focus trap
│   │   ├── Tabs.tsx                    # Mobile-friendly sliding indicator tabs
│   │   └── Skeleton.tsx                # Pulse loader matching card and metrics dimensions
│   ├── compound/
│   │   ├── GigCard.tsx                 # Dynamic creative grid card with media slider & pricing
│   │   ├── MetricWidget.tsx            # Single KPI card displaying trajectory trendline
│   │   ├── PackageTierMatrix.tsx       # 3-column desktop / swipeable mobile tier comparison
│   │   ├── OrderTimelineTracker.tsx    # Vertical stepped progress indicator for active order
│   │   ├── OrderRowItem.tsx            # Desktop table row (>=1024px)
│   │   ├── OrderCardItem.tsx           # Mobile stacked card (<768px)
│   │   ├── CountdownClock.tsx          # Real-time ticking deadline display with tabular nums
│   │   └── FilterSlideOver.tsx         # Mobile drawer / Desktop filter bar
│   └── domain/
│       ├── GigExplorerGrid.tsx         # Creative Masonry/Auto-fill layout with debounced query
│       ├── SellerDashboardView.tsx     # Metrics summary, seller progression progress
│       ├── OrderManagementQueue.tsx    # Responsive lifecycle view switching table/cards
│       ├── GigCreationDrawer.tsx       # Multi-step package and pricing configurator
│       └── EarningsBreakdownView.tsx   # Withdrawal and clearance ledger with CSV export
├── context/
│   ├── MarketplaceContext.tsx          # Global data access, optimistic mutations, order transitions
│   └── ToastContext.tsx                # Non-blocking feedback notifications
├── hooks/
│   ├── useLocalStorageSync.ts          # Reactive schema-safe local state with CustomEvent bus
│   ├── useOrderCountdown.ts            # High-precision interval countdown hook
│   ├── useSellerProgression.ts         # Seller level qualification engine
│   └── useDebounce.ts                  # Value throttling hook for input streams
└── utils/
    ├── currency.ts                     # Cents to formatted localized currency strings
    ├── date.ts                         # ISO parsing, relative formats, computeRemainingTime(dueDate, now): TimeRemaining
    ├── id.ts                           # Environment-safe UUID generator fallback
    └── seedData.ts                     # Deterministic rich dataset for immediate load
```

---

## 3. Core Feature Logic & Pure Implementations

### 3.1 Seller Level Qualification Engine

```typescript
export interface SellerQualificationResult {
  currentLevel: SellerLevel;
  nextLevel: SellerLevel | null;
  requirements: {
    label: string;
    target: number;
    current: number;
    unit: 'percent' | 'count' | 'currency';
    isMet: boolean;
  }[];
  eligibleForPromotion: boolean;
}

export function evaluateSellerLevel(profile: UserProfile): SellerQualificationResult {
  const current = profile.level;

  if (current === 'top_rated') {
    return {
      currentLevel: 'top_rated',
      nextLevel: null,
      requirements: [],
      eligibleForPromotion: false,
    };
  }

  const targets = {
    level_one: {
      earningsCents: 40000,
      orderCount: 10,
      rating: 4.5,
      responseRate: 90,
      onTimeDelivery: 90,
      orderCompletion: 90,
    },
    level_two: {
      earningsCents: 200000,
      orderCount: 50,
      rating: 4.7,
      responseRate: 90,
      onTimeDelivery: 90,
      orderCompletion: 90,
    },
    top_rated: {
      earningsCents: 1000000,
      orderCount: 100,
      rating: 4.8,
      responseRate: 90,
      onTimeDelivery: 90,
      orderCompletion: 90,
    },
  };

  const next = current === 'new_seller' ? 'level_one' : current === 'level_one' ? 'level_two' : 'top_rated';
  const threshold = targets[next];

  const reqs = [
    {
      label: 'Completed Orders',
      target: threshold.orderCount,
      current: profile.completedOrdersCount,
      unit: 'count' as const,
      isMet: profile.completedOrdersCount >= threshold.orderCount,
    },
    {
      label: 'Total Earnings',
      target: threshold.earningsCents,
      current: profile.totalEarnedCents,
      unit: 'currency' as const,
      isMet: profile.totalEarnedCents >= threshold.earningsCents,
    },
    {
      label: 'Rating Score',
      target: threshold.rating,
      current: profile.rating,
      unit: 'count' as const,
      isMet: profile.rating >= threshold.rating,
    },
    {
      label: 'Response Rate',
      target: threshold.responseRate,
      current: profile.responseRatePercent,
      unit: 'percent' as const,
      isMet: profile.responseRatePercent >= threshold.responseRate,
    },
    {
      label: 'On-Time Delivery',
      target: threshold.onTimeDelivery,
      current: profile.onTimeDeliveryPercent,
      unit: 'percent' as const,
      isMet: profile.onTimeDeliveryPercent >= threshold.onTimeDelivery,
    },
    {
      label: 'Order Completion',
      target: threshold.orderCompletion,
      current: profile.orderCompletionPercent,
      unit: 'percent' as const,
      isMet: profile.orderCompletionPercent >= threshold.orderCompletion,
    },
  ];

  return {
    currentLevel: current,
    nextLevel: next,
    requirements: reqs,
    eligibleForPromotion: reqs.every((r) => r.isMet),
  };
}
```

### 3.2 Real-Time Order Countdown Calculation (`src/utils/date.ts`)

```typescript
export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isOverdue: boolean;
  formattedString: string;
}

export function computeRemainingTime(dueDateIsoString: string, currentTimestamp: number): TimeRemaining {
  const dueTimestamp = new Date(dueDateIsoString).getTime();
  const diff = dueTimestamp - currentTimestamp;
  const isOverdue = diff <= 0;
  const absDiff = Math.abs(diff);

  const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((absDiff / 1000 / 60) % 60);
  const seconds = Math.floor((absDiff / 1000) % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');
  const formattedString = `${days > 0 ? `${days}d ` : ''}${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;

  return {
    days,
    hours,
    minutes,
    seconds,
    isOverdue,
    formattedString,
  };
}
```

### 3.3 Safe ID Generator Utility (`src/utils/id.ts`)

```typescript
export function generateSafeId(prefix = ''): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  return prefix ? `${prefix}-${randomPart}` : randomPart;
}
```

### 3.4 Reactive State Storage Hook (`src/hooks/useLocalStorageSync.ts`)

```typescript
import { useState, useEffect, useCallback } from 'react';

export function useLocalStorageSync<T>(
  key: string,
  initialValue: T
): [T, (valOrFn: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      if (typeof window === 'undefined') {
        return;
      }
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
          window.dispatchEvent(
            new CustomEvent(`local-storage-sync:${key}`, { detail: nextValue })
          );
        } catch (err) {
          console.error(`Storage set error for key: ${key}`, err);
        }
        return nextValue;
      });
    },
    [key]
  );

  useEffect(() => {
    const handleCustomSync = (e: Event) => {
      setStoredValue((e as CustomEvent<T>).detail);
    };

    const handleWindowStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      try {
        const item = window.localStorage.getItem(key);
        setStoredValue(item ? (JSON.parse(item) as T) : initialValue);
      } catch {
        // preserve existing state on JSON parse failure
      }
    };

    window.addEventListener(`local-storage-sync:${key}`, handleCustomSync);
    window.addEventListener('storage', handleWindowStorage);
    return () => {
      window.removeEventListener(`local-storage-sync:${key}`, handleCustomSync);
      window.removeEventListener('storage', handleWindowStorage);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
}
```

### 3.5 High-Precision Order Countdown Hook (`src/hooks/useOrderCountdown.ts`)

```typescript
import { useState, useEffect } from 'react';
import { computeRemainingTime, TimeRemaining } from '../utils/date';

export function useOrderCountdown(dueDateIsoString: string): TimeRemaining {
  const [remaining, setRemaining] = useState<TimeRemaining>(() =>
    computeRemainingTime(dueDateIsoString, Date.now())
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemaining(computeRemainingTime(dueDateIsoString, Date.now()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [dueDateIsoString]);

  return remaining;
}
```

### 3.6 Generic Debounce Hook (`src/hooks/useDebounce.ts`)

```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(handler);
  }, [value, delayMs]);

  return debouncedValue;
}
```

---

## 4. Mobile-First Responsive Breakpoints & Viewport Validation

| Breakpoint | CSS Media Query | Layout Architecture | Essential Controls Access |
|---|---|---|---|
| **360px - 390px (Mobile S/M)** | `@media (max-width: 430px)` | 1-column single grid card; bottom navigation bar fixed at `--nav-bottom-height: 56px`. Main content has `pb-[calc(var(--nav-bottom-height)+16px)]`. Orders render as stacked `OrderCardItem` elements (table view disabled). | Filter modal triggers via full-screen bottom sheet; all touch actions have min 48px height. |
| **430px (Mobile L)** | `@media (min-width: 430px) and (max-width: 767px)` | 1-column expanded grid; full-bleed card thumbnails; side-scrollable horizontal metric tags. `PackageTierMatrix` swipe container uses `w-screen -mx-4 px-4 overflow-x-auto snap-x snap-mandatory flex gap-4`. | Sticky drawer action sits at `bottom: var(--nav-bottom-height)`. Non-hover swipeable package tier cards. |
| **768px (Tablet)** | `@media (min-width: 768px) and (max-width: 1023px)` | 2-column balanced dynamic grid; top horizontal category chip bar; compact side filter menu. Order table renders via `OrderRowItem` but hides Buyer Username, Service Fee, and Start Date columns. | Inline package comparison; compact 4-column order list with drawer expansion. |
| **1024px+ (Desktop)** | `@media (min-width: 1024px)` | 3 to 4-column modern creative gig grid; multi-pane seller stats; split screen order delivery workspace. Full 7-column order ledger visible. | Full sidebar navigation, instant filter bar, comprehensive 3-tier package matrix. |

---

## 5. Five-Phase Sequential Queue

### Phase 1: Types, Storage/API Client Config, and Base Utilities
- [x] Configure pure TypeScript definitions for `UserProfile`, `SellerSnippet`, `GigItem`, `GigPackage`, `OrderItem`, `CreateGigInput`, `ORDER_STATUS_TRANSITIONS`, and `DELIVERY_CONSTRAINTS`.
- [ ] Implement reactive storage engine (`useLocalStorageSync`) with cross-tab and in-tab `CustomEvent` synchronization.
- [ ] Implement `src/utils/id.ts` using `generateSafeId` with crypto/timestamp fallback.
- [ ] Implement `src/utils/date.ts` containing `computeRemainingTime` and relative date formatters.
- [ ] Implement `src/utils/currency.ts` providing `formatCentsToUsd(cents: number)`.
- [ ] Build deterministic seed dataset in `src/utils/seedData.ts`: 12 detailed Gigs across 6 categories (all entries must use `status: 'active'`; bare `isActive` field is omitted), 8 active/historical Orders with `revisionCountTotal`, and complete `UserProfile` metrics with `completedOrdersCount`.
- [ ] Validate runtime initialization with sanity checks for empty or corrupted storage states.

### Phase 2: Design Foundation & Atomic UI Primitives
- [ ] Establish Tailwind v4 CSS-first theme tokens directly in the primary CSS file via `@theme` declarations (no `tailwind.config.js`):
  - Theme variables: `--color-surface-bg: var(--color-slate-900)`, `--color-surface-card: var(--color-slate-800)`, `--color-surface-border: var(--color-slate-700)`, `--color-brand-primary: var(--color-emerald-500)`, `--color-brand-hover: var(--color-emerald-400)`, `--color-brand-accent: var(--color-amber-400)`.
  - Global layout variables: `--nav-bottom-height: 56px`.
- [ ] Construct atomic UI components:
  - `Button.tsx`: Variants (`primary`, `secondary`, `outline`, `danger`), supporting loading spinners and min 44px touch targets.
  - `Badge.tsx`: Visual variants for Seller Level, Order Status, and Active/Paused states.
  - `Avatar.tsx`: Responsive dimensions, fallback initials monogram, and seller level badge ring.
  - `Input.tsx` and `Select.tsx`: High-contrast form elements supporting 48px mobile touch targets and leading search icons.
  - `Modal.tsx`: Accessible dialog with focus trap and mobile bottom-sheet transform.
  - `Skeleton.tsx`: Grid, list, and profile pulse loaders matching production widget heights.

### Phase 3: Compound Molecules & Feature Components
- [ ] Build `GigCard.tsx`:
  - 16:10 aspect ratio image showcase with visual overlay.
  - Seller identity row (avatar, username, seller tier badge via `SellerSnippet`).
  - Truncated service title with two-line clamp.
  - Star rating and review count indicator.
  - Status badge indicating active/paused states.
  - Bottom footer displaying "Starting at $XX" with delivery badge.
- [ ] Build `PackageTierMatrix.tsx`:
  - Basic, Standard, and Premium packages displaying price, delivery time, revisions, and feature checklists.
  - Mobile container (`< 768px`): `w-screen -mx-4 px-4 overflow-x-auto snap-x snap-mandatory flex gap-4` preventing page-level horizontal overflow; 3-column grid for `>= 768px`.
- [ ] Build `MetricWidget.tsx`:
  - Metric label, monetary/numerical value, percentage delta indicator, and sparkline container.
- [ ] Build `OrderTimelineTracker.tsx`:
  - Visual status stages based on `ORDER_STATUS_TRANSITIONS`: `pending_requirements` -> `in_progress` -> `delivered` -> `completed` (or `revision`).
- [ ] Build `CountdownClock.tsx`:
  - Real-time second-by-second display driven by `useOrderCountdown`.
  - Monospace formatting via `font-variant-numeric: tabular-nums` with each unit (days, hours, minutes, seconds) housed in an individual `<span>` with `min-width: 2ch`.
  - Amber warning state for `< 12h`, red pulse state for overdue orders.
- [ ] Build `OrderRowItem.tsx` and `OrderCardItem.tsx`:
  - `OrderCardItem.tsx`: Stacked card layout with countdown badge, client info, and direct mobile CTA for `< 768px`.
  - `OrderRowItem.tsx`: High-density desktop table row with responsive column collapse at 768px-1023px.
- [ ] Build `FilterSlideOver.tsx`:
  - Touch-friendly sliding drawer for mobile and inline sidebar for desktop filter application.

### Phase 4: Domain Logic, Reactive State, and Specialized APIs
- [ ] Construct `MarketplaceContext.tsx`:
  - Store reactive collections for Gigs, Orders, and Active User Profile.
  - Implement `updateOrderStatus(orderId, newStatus)` with transition guard enforcing `ORDER_STATUS_TRANSITIONS[currentStatus].includes(newStatus)`.
  - Implement `createNewGig(payload: CreateGigInput): Promise<GigItem>` with optimistic UI update:
    - Generate temporary `tempId = generateSafeId('optimistic')`.
    - Auto-inject authenticated seller context: `sellerId: currentUser.id`, `seller: toSellerSnippet(currentUser)`.
    - Optimistically prepend to gigs state.
    - Write to persistent storage; on rejection, rollback via `prev.filter((g) => !g.id.startsWith('optimistic-'))` and throw error.
  - Implement `promoteSellerIfEligible()` evaluating `evaluateSellerLevel()`.
- [ ] Implement Search and Faceted Filtering:
  - Wire search input in `GigExplorerGrid` through `useDebounce(searchQuery, 300)`.
  - Apply multi-parameter filtering: category matches, price ranges, max delivery days, seller tiers.
- [ ] Implement `useSellerProgression` hook connecting seller statistics (`completedOrdersCount`, `totalEarnedCents`) to qualification requirements.
- [ ] Implement order delivery and revision handlers:
  - Validate uploads against `DELIVERY_CONSTRAINTS` (max 5 files, 100MB max payload, approved MIME types).
  - Verify `revisionCountRemaining > 0` before decrementing and transitioning status to `in_progress`.

### Phase 5: Complete Page/Screen Assembly & Responsive Shell
- [ ] Build top navigation header:
  - Marketplace branding, debounced search bar, notifications popover, seller/buyer mode switcher, user avatar.
- [ ] Build mobile bottom navigation bar (`< 768px`):
  - Fixed 56px height (`--nav-bottom-height`) with buttons for Explorer, Orders, Earnings, and Profile.
- [ ] Build "Gig Explorer" View:
  - Category pill filter ribbon with horizontal scroll.
  - Responsive multi-column creative gig grid (1 col mobile, 2 col tablet, 3-4 col desktop).
  - Empty search state with one-click filter reset.
- [ ] Build "Seller Management Dashboard" View:
  - 4 Metric cards (Gross Earnings, Active Orders, Completion Rate, Average Rating).
  - Seller level progression progress bar indicating metrics required for promotion.
  - Active orders workflow queue switching automatically between `OrderCardItem` on mobile and `OrderRowItem` on tablet/desktop.
- [ ] Build "Earnings & Finances" View:
  - Available balance, Pending clearance timer, and transaction history ledger with mock CSV download.
- [ ] Verify full responsive validation across 360px, 390px, 430px, 768px, and 1280px without viewport overflow or overlapping sticky controls.