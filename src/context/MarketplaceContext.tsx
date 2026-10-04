import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useToast } from './ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { evaluateSellerLevel } from '../hooks/useSellerProgression';
import {
  DELIVERY_CONSTRAINTS,
  ORDER_STATUS_TRANSITIONS,
  type CreateGigInput,
  type GigCategory,
  type GigFilterState,
  type GigItem,
  type LedgerEntry,
  type MutationResult,
  type NotificationItem,
  type OrderDeliveryFile,
  type OrderItem,
  type OrderStatus,
  type SellerLevel,
  type SellerMetricBreakdown,
  type SellerMode,
  type SellerSnippet,
  type UserProfile,
} from '../types/marketplace';
import { calculateNetRevenueCents, calculateServiceFeeCents } from '../utils/currency';
import { generateSafeId, slugify } from '../utils/id';
import { createSeedDataset, type SellerKpiSeries } from '../utils/seedData';
import {
  STORAGE_KEYS,
  inspectStorageHealth,
  readRawStorageValue,
  sanitizeGigCollection,
  sanitizeLedgerCollection,
  sanitizeNotificationCollection,
  sanitizeOrderCollection,
  sanitizeUserProfile,
  type StorageIntegrityReport,
} from '../utils/storage';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

export const DEFAULT_FILTERS: GigFilterState = {
  searchQuery: '',
  category: 'All',
  minBudget: 0,
  maxBudget: 0,
  deliveryMaxDays: 0,
  sellerLevels: [],
  sortBy: 'relevance',
};

export type HydrationSource = 'seed' | 'restored' | 'repaired';

/** Narrows a `UserProfile` to the compact seller representation embedded in gigs. */
export function toSellerSnippet(profile: UserProfile): SellerSnippet {
  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    level: profile.level,
    rating: profile.rating,
    ratingCount: profile.ratingCount,
  };
}

export interface DeliveryFileInput {
  name: string;
  sizeBytes: number;
  mimeType: string;
}

export interface DeliveryValidationResult {
  isValid: boolean;
  errors: string[];
  totalSizeBytes: number;
}

/**
 * Validates an upload batch against `DELIVERY_CONSTRAINTS`.
 * Checks file count, per-file size, aggregate payload size and MIME types.
 */
export function validateDeliveryFiles(files: DeliveryFileInput[]): DeliveryValidationResult {
  const errors: string[] = [];
  const totalSizeBytes = files.reduce((sum, file) => sum + file.sizeBytes, 0);

  if (files.length === 0) {
    errors.push('Attach at least one file before delivering the order.');
  }

  if (files.length > DELIVERY_CONSTRAINTS.maxFiles) {
    errors.push(`A delivery can include at most ${DELIVERY_CONSTRAINTS.maxFiles} files.`);
  }

  const oversized = files.filter((file) => file.sizeBytes > DELIVERY_CONSTRAINTS.maxSizeBytes);
  if (oversized.length > 0) {
    errors.push(
      `${oversized.length} file(s) exceed the ${Math.round(DELIVERY_CONSTRAINTS.maxSizeBytes / 1024 / 1024)}MB per-file limit.`
    );
  }

  if (totalSizeBytes > DELIVERY_CONSTRAINTS.maxSizeBytes) {
    errors.push(
      `Total payload of ${(totalSizeBytes / 1024 / 1024).toFixed(1)}MB exceeds the ${
        DELIVERY_CONSTRAINTS.maxSizeBytes / 1024 / 1024
      }MB limit.`
    );
  }

  const rejected = files.filter(
    (file) => !(DELIVERY_CONSTRAINTS.allowedMimeTypes as readonly string[]).includes(file.mimeType)
  );
  if (rejected.length > 0) {
    errors.push(
      `Unsupported format: ${rejected.map((file) => file.name).join(', ')}. Allowed types: ${DELIVERY_CONSTRAINTS.allowedMimeTypes
        .map((mime) => mime.split('/').pop())
        .join(', ')}.`
    );
  }

  return { isValid: errors.length === 0, errors, totalSizeBytes };
}

function writeStorage(key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Storage is unavailable in this environment.'));
      return;
    }
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      window.dispatchEvent(new CustomEvent(`local-storage-sync:${key}`, { detail: value }));
      resolve();
    } catch (error) {
      reject(error instanceof Error ? error : new Error('Failed to persist marketplace state.'));
    }
  });
}

interface HydratedState {
  gigs: GigItem[];
  orders: OrderItem[];
  profile: UserProfile;
  ledger: LedgerEntry[];
  notifications: NotificationItem[];
  metrics: SellerMetricBreakdown[];
  kpiSeries: SellerKpiSeries[];
  source: HydrationSource;
  reports: StorageIntegrityReport[];
}

/** Reads persisted collections, repairing what is recoverable and reseeding the rest. */
function hydrateFromStorage(): HydratedState {
  const seed = createSeedDataset();
  const reports = inspectStorageHealth();

  const gigsRaw = readRawStorageValue(STORAGE_KEYS.gigs);
  const ordersRaw = readRawStorageValue(STORAGE_KEYS.orders);
  const ledgerRaw = readRawStorageValue(STORAGE_KEYS.ledger);
  const notificationsRaw = readRawStorageValue(STORAGE_KEYS.notifications);
  const profileRaw = readRawStorageValue(STORAGE_KEYS.profile);

  const gigs = gigsRaw.state === 'valid' ? sanitizeGigCollection(gigsRaw.value).value : [];
  const orders = ordersRaw.state === 'valid' ? sanitizeOrderCollection(ordersRaw.value).value : [];
  const ledger = ledgerRaw.state === 'valid' ? sanitizeLedgerCollection(ledgerRaw.value).value : [];
  const notifications =
    notificationsRaw.state === 'valid' ? sanitizeNotificationCollection(notificationsRaw.value).value : [];
  const profile = profileRaw.state === 'valid' ? sanitizeUserProfile(profileRaw.value, seed.profile) : seed.profile;

  const repaired = reports.some((report) => report.status === 'recovered' || report.status === 'corrupted');
  const hasPersistedState = reports.some((report) => report.status === 'healthy' || report.status === 'recovered');

  const source: HydrationSource =
    gigs.length === 0 && orders.length === 0
      ? 'seed'
      : repaired
        ? 'repaired'
        : hasPersistedState
          ? 'restored'
          : 'seed';

  return {
    gigs: gigs.length > 0 ? gigs : seed.gigs,
    orders: orders.length > 0 ? orders : seed.orders,
    profile,
    ledger: ledger.length > 0 ? ledger : seed.ledger,
    notifications: notifications.length > 0 ? notifications : seed.notifications,
    metrics: seed.metrics,
    kpiSeries: seed.kpiSeries,
    source,
    reports,
  };
}

/** Pure faceted search over the gig collection. */
export function filterGigs(gigs: GigItem[], filters: GigFilterState): GigItem[] {
  const query = filters.searchQuery.trim().toLowerCase();

  const filtered = gigs.filter((gig) => {
    if (gig.status === 'deleted') {
      return false;
    }
    if (filters.category !== 'All' && gig.category !== filters.category) {
      return false;
    }
    if (filters.minBudget > 0 && gig.packages.standard.priceCents < filters.minBudget) {
      return false;
    }
    if (filters.maxBudget > 0 && gig.packages.basic.priceCents > filters.maxBudget) {
      return false;
    }
    if (filters.deliveryMaxDays > 0 && gig.packages.basic.deliveryDays > filters.deliveryMaxDays) {
      return false;
    }
    if (filters.sellerLevels.length > 0 && !filters.sellerLevels.includes(gig.seller.level)) {
      return false;
    }
    if (query.length > 0) {
      const haystack = `${gig.title} ${gig.category} ${gig.subcategory} ${gig.seller.displayName} ${gig.seller.username}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });

  const sorted = [...filtered];
  switch (filters.sortBy) {
    case 'rating':
      sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
      break;
    case 'price_asc':
      sorted.sort((a, b) => a.startingPriceCents - b.startingPriceCents);
      break;
    case 'price_desc':
      sorted.sort((a, b) => b.startingPriceCents - a.startingPriceCents);
      break;
    case 'orders_count':
      sorted.sort((a, b) => b.ordersInQueueCount - a.ordersInQueueCount || b.reviewCount - a.reviewCount);
      break;
    case 'relevance':
    default:
      sorted.sort(
        (a, b) => b.rating * Math.log10(b.reviewCount + 10) - a.rating * Math.log10(a.reviewCount + 10)
      );
      break;
  }
  return sorted;
}

export function countGigsByCategory(gigs: GigItem[]): Record<GigCategory, number> {
  return gigs.reduce<Record<GigCategory, number>>(
    (accumulator, gig) => {
      accumulator[gig.category] += 1;
      return accumulator;
    },
    {
      'Graphics & Design': 0,
      'Digital Marketing': 0,
      'Writing & Translation': 0,
      'Video & Animation': 0,
      'Music & Audio': 0,
      'Programming & Tech': 0,
      'AI Services': 0,
    }
  );
}

/* -------------------------------------------------------------------------- */
/* Context                                                                     */
/* -------------------------------------------------------------------------- */

export interface MarketplaceContextValue {
  gigs: GigItem[];
  orders: OrderItem[];
  currentUser: UserProfile;
  ledger: LedgerEntry[];
  notifications: NotificationItem[];
  metrics: SellerMetricBreakdown[];
  kpiSeries: SellerKpiSeries[];
  hydrationSource: HydrationSource;
  storageReports: StorageIntegrityReport[];
  unreadNotificationCount: number;

  sellerMode: SellerMode;
  setSellerMode: (mode: SellerMode) => void;

  filters: GigFilterState;
  setFilters: (next: GigFilterState | ((previous: GigFilterState) => GigFilterState)) => void;
  resetFilters: () => void;
  /** Debounced query used for the explorer search stream (300ms). */
  debouncedSearchQuery: string;
  filteredGigs: GigItem[];
  categoryCounts: Record<GigCategory, number>;
  myGigs: GigItem[];

  createNewGig: (payload: CreateGigInput) => Promise<GigItem>;
  toggleGigStatus: (gigId: string) => MutationResult<GigItem>;
  updateOrderStatus: (orderId: string, newStatus: OrderStatus) => MutationResult<OrderItem>;
  deliverOrder: (orderId: string, files: DeliveryFileInput[]) => MutationResult<OrderItem>;
  requestRevision: (orderId: string, note: string) => MutationResult<OrderItem>;
  promoteSellerIfEligible: () => MutationResult<UserProfile>;
  markNotificationsRead: () => void;
  resetMarketplace: () => void;
}

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

const SEARCH_DEBOUNCE_MS = 300;

export function MarketplaceProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const { pushToast } = useToast();
  const hydrated = useRef<HydratedState | null>(null);
  if (hydrated.current === null) {
    hydrated.current = hydrateFromStorage();
  }

  const [gigs, setGigs] = useState<GigItem[]>(() => hydrated.current?.gigs ?? []);
  const [orders, setOrders] = useState<OrderItem[]>(() => hydrated.current?.orders ?? []);
  const [profile, setProfile] = useState<UserProfile>(() => hydrated.current?.profile ?? createSeedDataset().profile);
  const [ledger, setLedger] = useState<LedgerEntry[]>(() => hydrated.current?.ledger ?? []);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => hydrated.current?.notifications ?? []);
  const [sellerMode, setSellerModeState] = useState<SellerMode>('seller');
  const [filters, setFiltersState] = useState<GigFilterState>(DEFAULT_FILTERS);

  const metrics = hydrated.current?.metrics ?? [];
  const kpiSeries = hydrated.current?.kpiSeries ?? [];
  const storageReports = hydrated.current?.reports ?? [];
  const hydrationSource = hydrated.current?.source ?? 'seed';

  // Persist every collection write; a storage failure surfaces as a toast and
  // leaves in-memory state untouched so the next successful write recovers.
  useEffect(() => {
    void writeStorage(STORAGE_KEYS.gigs, gigs).catch(() => {
      pushToast({
        tone: 'error',
        title: 'Could not save gigs',
        description: 'Local storage rejected the write. Your changes are kept in memory only.',
      });
    });
  }, [gigs, pushToast]);

  useEffect(() => {
    void writeStorage(STORAGE_KEYS.orders, orders).catch(() => {
      pushToast({
        tone: 'error',
        title: 'Could not save orders',
        description: 'Local storage rejected the write. Your changes are kept in memory only.',
      });
    });
  }, [orders, pushToast]);

  useEffect(() => {
    void writeStorage(STORAGE_KEYS.profile, profile).catch(() => undefined);
  }, [profile]);

  useEffect(() => {
    void writeStorage(STORAGE_KEYS.ledger, ledger).catch(() => undefined);
  }, [ledger]);

  useEffect(() => {
    void writeStorage(STORAGE_KEYS.notifications, notifications).catch(() => undefined);
  }, [notifications]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.sellerMode, sellerMode).catch(() => undefined);
  }, [sellerMode]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.filters, filters).catch(() => undefined);
  }, [filters]);

  const debouncedSearchQuery = useDebounce(filters.searchQuery, SEARCH_DEBOUNCE_MS);

  const effectiveFilters = useMemo<GigFilterState>(
    () => ({ ...filters, searchQuery: debouncedSearchQuery }),
    [filters, debouncedSearchQuery]
  );

  const filteredGigs = useMemo(() => filterGigs(gigs, effectiveFilters), [gigs, effectiveFilters]);
  const categoryCounts = useMemo(() => countGigsByCategory(gigs), [gigs]);
  const myGigs = useMemo(() => gigs.filter((gig) => gig.sellerId === profile.id), [gigs, profile.id]);

  const setSellerMode = useCallback((mode: SellerMode) => {
    setSellerModeState(mode);
  }, []);

  const setFilters = useCallback((next: GigFilterState | ((previous: GigFilterState) => GigFilterState)) => {
    setFiltersState((previous) => (typeof next === 'function' ? next(previous) : next));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  /**
   * Optimistic gig creation.
   *
   * A temporary `optimistic-*` record is prepended immediately, then the
   * persistence write is awaited. On rejection every optimistic entry is
   * rolled back and the error is re-thrown to the caller.
   */
  const createNewGig = useCallback(
    async (payload: CreateGigInput): Promise<GigItem> => {
      const tempId = generateSafeId('optimistic');
      const nowIso = new Date().toISOString();

      const optimisticGig: GigItem = {
        ...payload,
        id: tempId,
        sellerId: profile.id,
        seller: toSellerSnippet(profile),
        slug: payload.slug.length > 0 ? payload.slug : slugify(payload.title),
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      setGigs((previous) => [optimisticGig, ...previous]);

      try {
        await writeStorage(STORAGE_KEYS.gigs, [optimisticGig, ...gigs]);
      } catch (error) {
        setGigs((previous) => previous.filter((gig) => !gig.id.startsWith('optimistic-')));
        pushToast({
          tone: 'error',
          title: 'Gig not published',
          description: 'The listing could not be saved locally and was rolled back.',
        });
        throw error;
      }

      const persistedGig: GigItem = { ...optimisticGig, id: generateSafeId('gig') };
      setGigs((previous) => previous.map((gig) => (gig.id === tempId ? persistedGig : gig)));

      pushToast({
        tone: 'success',
        title: 'Gig published',
        description: `${persistedGig.title} is now live in the marketplace.`,
      });

      return persistedGig;
    },
    [gigs, profile, pushToast]
  );

  const toggleGigStatus = useCallback(
    (gigId: string): MutationResult<GigItem> => {
      const target = gigs.find((gig) => gig.id === gigId);
      if (!target) {
        return { ok: false, error: 'That gig no longer exists.' };
      }
      if (target.sellerId !== profile.id) {
        return { ok: false, error: 'You can only change the status of your own listings.' };
      }

      const nextStatus: GigItem['status'] = target.status === 'active' ? 'paused' : 'active';
      const updated: GigItem = { ...target, status: nextStatus, updatedAt: new Date().toISOString() };
      setGigs((previous) => previous.map((gig) => (gig.id === gigId ? updated : gig)));

      pushToast({
        tone: 'info',
        title: nextStatus === 'active' ? 'Listing resumed' : 'Listing paused',
        description: target.title,
      });

      return { ok: true, data: updated };
    },
    [gigs, profile.id, pushToast]
  );

  const updateOrderStatus = useCallback(
    (orderId: string, newStatus: OrderStatus): MutationResult<OrderItem> => {
      const order = orders.find((candidate) => candidate.id === orderId);
      if (!order) {
        return { ok: false, error: 'That order no longer exists.' };
      }
      if (order.status === newStatus) {
        return { ok: true, data: order };
      }

      const allowedTransitions = ORDER_STATUS_TRANSITIONS[order.status];
      if (!allowedTransitions.includes(newStatus)) {
        return {
          ok: false,
          error: `An order in "${order.status}" cannot move to "${newStatus}".`,
        };
      }

      const nowIso = new Date().toISOString();
      const updated: OrderItem = {
        ...order,
        status: newStatus,
        updatedAt: nowIso,
        deliveredAt: newStatus === 'delivered' ? nowIso : order.deliveredAt,
        completedAt: newStatus === 'completed' ? nowIso : order.completedAt,
      };

      setOrders((previous) => previous.map((candidate) => (candidate.id === orderId ? updated : candidate)));

      if (newStatus === 'completed') {
        const netCents = order.netRevenueCents;
        setLedger((previous) => [
          {
            id: generateSafeId('ledger'),
            orderNumber: order.orderNumber,
            gigTitle: order.gigTitle,
            grossCents: order.amountCents,
            feeCents: calculateServiceFeeCents(order.amountCents),
            netCents: calculateNetRevenueCents(order.amountCents),
            createdAt: nowIso,
            availableAt: new Date(Date.parse(nowIso) + 7 * 86_400_000).toISOString(),
            status: 'pending_clearance',
            method: 'Wise ···· 4821',
          },
          ...previous,
        ]);
        setProfile((previous) => ({
          ...previous,
          completedOrdersCount: previous.completedOrdersCount + 1,
          totalEarnedCents: previous.totalEarnedCents + netCents,
          pendingClearanceCents: previous.pendingClearanceCents + netCents,
        }));
      }

      pushToast({
        tone: 'success',
        title: `Order ${order.orderNumber} updated`,
        description: `Moved to ${newStatus.replace(/_/g, ' ')}.`,
      });

      return { ok: true, data: updated };
    },
    [orders, pushToast]
  );

  const deliverOrder = useCallback(
    (orderId: string, files: DeliveryFileInput[]): MutationResult<OrderItem> => {
      const order = orders.find((candidate) => candidate.id === orderId);
      if (!order) {
        return { ok: false, error: 'That order no longer exists.' };
      }
      if (!ORDER_STATUS_TRANSITIONS[order.status].includes('delivered')) {
        return { ok: false, error: `Files can only be attached to orders in "in_progress" or "revision".` };
      }
      if (order.revisionCountRemaining <= 0) {
        return { ok: false, error: 'No revisions remain on this order.' };
      }

      const validation = validateDeliveryFiles(files);
      if (!validation.isValid) {
        return { ok: false, error: validation.errors.join(' ') };
      }

      const nowIso = new Date().toISOString();
      const deliveryFiles: OrderDeliveryFile[] = files.map((file) => ({
        name: file.name,
        url: `local://deliveries/${order.orderNumber}/${encodeURIComponent(file.name)}`,
        sizeBytes: file.sizeBytes,
        mimeType: file.mimeType,
      }));

      const updated: OrderItem = {
        ...order,
        status: 'delivered',
        deliveredAt: nowIso,
        updatedAt: nowIso,
        revisionCountRemaining: Math.max(0, order.revisionCountRemaining - 1),
        deliveryFiles: [...order.deliveryFiles, ...deliveryFiles],
      };

      setOrders((previous) => previous.map((candidate) => (candidate.id === orderId ? updated : candidate)));

      pushToast({
        tone: 'success',
        title: `Delivery sent for ${order.orderNumber}`,
        description: `${deliveryFiles.length} file(s), ${(validation.totalSizeBytes / 1024 / 1024).toFixed(1)}MB total.`,
      });

      return { ok: true, data: updated };
    },
    [orders, pushToast]
  );

  const requestRevision = useCallback(
    (orderId: string, note: string): MutationResult<OrderItem> => {
      const order = orders.find((candidate) => candidate.id === orderId);
      if (!order) {
        return { ok: false, error: 'That order no longer exists.' };
      }
      if (!ORDER_STATUS_TRANSITIONS[order.status].includes('revision')) {
        return { ok: false, error: 'Only delivered orders can receive a revision request.' };
      }
      if (order.revisionCountRemaining <= 0) {
        return { ok: false, error: 'No revisions remain on this order.' };
      }

      const nowIso = new Date().toISOString();
      const updated: OrderItem = {
        ...order,
        status: 'revision',
        revisionCountRemaining: order.revisionCountRemaining - 1,
        updatedAt: nowIso,
        requirements: [
          ...order.requirements,
          {
            id: generateSafeId('req'),
            question: `Revision note ${order.revisionCountTotal - order.revisionCountRemaining + 1}: ${note.trim()}`,
            answerText: undefined,
            isAnswered: false,
          },
        ],
      };

      setOrders((previous) => previous.map((candidate) => (candidate.id === orderId ? updated : candidate)));

      pushToast({
        tone: 'warning',
        title: `Revision requested on ${order.orderNumber}`,
        description: `${updated.revisionCountRemaining} revision(s) remaining.`,
      });

      return { ok: true, data: updated };
    },
    [orders, pushToast]
  );

  const promoteSellerIfEligible = useCallback((): MutationResult<UserProfile> => {
    const qualification = evaluateSellerLevel(profile);
    if (!qualification.eligibleForPromotion || qualification.nextLevel === null) {
      return {
        ok: false,
        error:
          qualification.nextLevel === null
            ? 'You already hold the highest seller tier.'
            : 'You have not met every requirement for the next tier yet.',
      };
    }

    const promotedLevel: SellerLevel = qualification.nextLevel;
    const promoted: UserProfile = { ...profile, level: promotedLevel };
    setProfile(promoted);

    pushToast({
      tone: 'success',
      title: 'Promoted to Top Rated',
      description: 'Your seller tier was upgraded — new perks are now live.',
      durationMs: 8000,
    });

    return { ok: true, data: promoted };
  }, [profile, pushToast]);

  const markNotificationsRead = useCallback(() => {
    setNotifications((previous) => previous.map((notification) => ({ ...notification, isRead: true })));
  }, []);

  const resetMarketplace = useCallback(() => {
    const seed = createSeedDataset();
    setGigs(seed.gigs);
    setOrders(seed.orders);
    setProfile(seed.profile);
    setLedger(seed.ledger);
    setNotifications(seed.notifications);
    setFiltersState(DEFAULT_FILTERS);
    pushToast({ tone: 'info', title: 'Demo data restored', description: 'The marketplace was reset to its seed state.' });
  }, [pushToast]);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const value = useMemo<MarketplaceContextValue>(
    () => ({
      gigs,
      orders,
      currentUser: profile,
      ledger,
      notifications,
      metrics,
      kpiSeries,
      hydrationSource,
      storageReports,
      unreadNotificationCount,
      sellerMode,
      setSellerMode,
      filters,
      setFilters,
      resetFilters,
      debouncedSearchQuery,
      filteredGigs,
      categoryCounts,
      myGigs,
      createNewGig,
      toggleGigStatus,
      updateOrderStatus,
      deliverOrder,
      requestRevision,
      promoteSellerIfEligible,
      markNotificationsRead,
      resetMarketplace,
    }),
    [
      gigs,
      orders,
      profile,
      ledger,
      notifications,
      metrics,
      kpiSeries,
      hydrationSource,
      storageReports,
      unreadNotificationCount,
      sellerMode,
      setSellerMode,
      filters,
      setFilters,
      resetFilters,
      debouncedSearchQuery,
      filteredGigs,
      categoryCounts,
      myGigs,
      createNewGig,
      toggleGigStatus,
      updateOrderStatus,
      deliverOrder,
      requestRevision,
      promoteSellerIfEligible,
      markNotificationsRead,
      resetMarketplace,
    ]
  );

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>;
}

/** Access marketplace data and mutations. Throws outside `MarketplaceProvider`. */
export function useMarketplace(): MarketplaceContextValue {
  const context = useContext(MarketplaceContext);
  if (context === null) {
    throw new Error('useMarketplace must be used within a MarketplaceProvider');
  }
  return context;
}
