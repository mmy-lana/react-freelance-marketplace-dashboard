/**
 * Persistence boundary guards.
 *
 * localStorage is untrusted input: users can carry state across app versions,
 * truncate JSON by accident, or hand-edit it. Every read of persisted state
 * goes through a sanitizer that either returns a fully typed record or reports
 * the record as unrecoverable so the caller can fall back to seed data.
 */

import {
  GIG_CATEGORIES,
  ORDER_STATUSES,
  PACKAGE_TIERS,
  SELLER_LEVELS,
  type GigCategory,
  type GigItem,
  type GigPackage,
  type LedgerEntry,
  type NotificationItem,
  type NotificationKind,
  type OrderItem,
  type OrderStatus,
  type PackageTier,
  type SellerLevel,
  type SellerSnippet,
  type UserProfile,
} from '../types/marketplace';

export const STORAGE_KEYS = {
  profile: 'gighub:profile:v1',
  gigs: 'gighub:gigs:v1',
  orders: 'gighub:orders:v1',
  ledger: 'gighub:ledger:v1',
  notifications: 'gighub:notifications:v1',
  filters: 'gighub:filters:v1',
  sellerMode: 'gighub:seller-mode:v1',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export type StorageIntegrityStatus = 'empty' | 'healthy' | 'recovered' | 'corrupted';

export interface StorageIntegrityReport {
  key: string;
  status: StorageIntegrityStatus;
  validRecords: number;
  recoveredRecords: number;
  discardedRecords: number;
  message: string;
}

export interface SanitizeResult<T> {
  value: T;
  recovered: number;
  discarded: number;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: UnknownRecord, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readNumber(record: UnknownRecord, key: string, fallback = 0): number {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readBoolean(record: UnknownRecord, key: string, fallback = false): boolean {
  const value = record[key];
  return typeof value === 'boolean' ? value : fallback;
}

function readEnum<T extends string>(record: UnknownRecord, key: string, allowed: readonly T[], fallback: T): T {
  const value = record[key];
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

function readStringArray(record: UnknownRecord, key: string): string[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function readIsoString(record: UnknownRecord, key: string, fallback: string): string {
  const value = record[key];
  if (typeof value !== 'string') {
    return fallback;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
}

const FALLBACK_ISO = new Date(0).toISOString();

/* -------------------------------------------------------------------------- */
/* Collection sanitizers                                                       */
/* -------------------------------------------------------------------------- */

export function sanitizeSellerSnippet(value: unknown): SellerSnippet | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = readString(value, 'id');
  const username = readString(value, 'username');
  if (!id || !username) {
    return null;
  }
  return {
    id,
    username,
    displayName: readString(value, 'displayName') ?? username,
    avatarUrl: readString(value, 'avatarUrl') ?? '',
    level: readEnum<SellerLevel>(value, 'level', SELLER_LEVELS, 'new_seller'),
    rating: readNumber(value, 'rating'),
    ratingCount: readNumber(value, 'ratingCount'),
  };
}

function sanitizePackage(value: unknown, tier: PackageTier, gigId: string): GigPackage | null {
  if (!isRecord(value)) {
    return null;
  }
  const priceCents = readNumber(value, 'priceCents', -1);
  const deliveryDays = readNumber(value, 'deliveryDays', -1);
  if (priceCents < 0 || deliveryDays < 0) {
    return null;
  }
  return {
    id: readString(value, 'id') ?? `${gigId}-pkg-${tier}`,
    tier,
    title: readString(value, 'title') ?? tier,
    description: typeof value.description === 'string' ? value.description : '',
    deliveryDays,
    revisions: Math.max(0, readNumber(value, 'revisions')),
    priceCents,
    features: readStringArray(value, 'features'),
  };
}

export function sanitizeGig(value: unknown): GigItem | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = readString(value, 'id');
  const title = readString(value, 'title');
  const seller = sanitizeSellerSnippet(value.seller);
  if (!id || !title || !seller) {
    return null;
  }

  const rawPackages = isRecord(value.packages) ? value.packages : {};
  const basic = sanitizePackage(rawPackages.basic, 'basic', id);
  const standard = sanitizePackage(rawPackages.standard, 'standard', id);
  const premium = sanitizePackage(rawPackages.premium, 'premium', id);
  if (!basic || !standard || !premium) {
    return null;
  }
  const packages: Record<PackageTier, GigPackage> = { basic, standard, premium };

  const createdAt = readIsoString(value, 'createdAt', FALLBACK_ISO);
  const thumbnailUrl = readString(value, 'thumbnailUrl') ?? '';

  return {
    id,
    sellerId: readString(value, 'sellerId') ?? seller.id,
    seller,
    title,
    slug: readString(value, 'slug') ?? id,
    category: readEnum<GigCategory>(value, 'category', GIG_CATEGORIES, GIG_CATEGORIES[0]),
    subcategory: readString(value, 'subcategory') ?? 'General',
    thumbnailUrl,
    images: readStringArray(value, 'images').length > 0 ? readStringArray(value, 'images') : thumbnailUrl ? [thumbnailUrl] : [],
    startingPriceCents: readNumber(value, 'startingPriceCents', packages.basic.priceCents),
    packages: packages as Record<PackageTier, GigPackage>,
    rating: readNumber(value, 'rating'),
    reviewCount: readNumber(value, 'reviewCount'),
    status: readEnum<GigItem['status']>(value, 'status', ['active', 'paused', 'deleted'], 'active'),
    impressionsCount: readNumber(value, 'impressionsCount'),
    clicksCount: readNumber(value, 'clicksCount'),
    ordersInQueueCount: readNumber(value, 'ordersInQueueCount'),
    createdAt,
    updatedAt: readIsoString(value, 'updatedAt', createdAt),
  };
}

export function sanitizeGigCollection(value: unknown): SanitizeResult<GigItem[]> {
  if (!Array.isArray(value)) {
    return { value: [], recovered: 0, discarded: value === undefined || value === null ? 0 : 1 };
  }
  const gigs: GigItem[] = [];
  let discarded = 0;
  value.forEach((entry) => {
    const gig = sanitizeGig(entry);
    if (gig) {
      gigs.push(gig);
    } else {
      discarded += 1;
    }
  });
  return { value: gigs, recovered: gigs.length, discarded };
}

export function sanitizeOrder(value: unknown): OrderItem | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = readString(value, 'id');
  const orderNumber = readString(value, 'orderNumber');
  const amountCents = readNumber(value, 'amountCents', -1);
  if (!id || !orderNumber || amountCents < 0) {
    return null;
  }

  const status = readEnum<OrderStatus>(value, 'status', ORDER_STATUSES, 'pending_requirements');
  const createdAt = readIsoString(value, 'createdAt', FALLBACK_ISO);
  const requirements = Array.isArray(value.requirements)
    ? value.requirements.filter(isRecord).map((requirement, index) => {
        const answerText = typeof requirement.answerText === 'string' ? requirement.answerText : undefined;
        return {
          id: readString(requirement, 'id') ?? `${id}-req-${index + 1}`,
          question: readString(requirement, 'question') ?? 'Untitled requirement',
          answerText,
          isAnswered: readBoolean(requirement, 'isAnswered', answerText !== undefined && answerText.length > 0),
        };
      })
    : [];

  return {
    id,
    orderNumber,
    gigId: readString(value, 'gigId') ?? '',
    gigTitle: readString(value, 'gigTitle') ?? 'Untitled gig',
    gigThumbnailUrl: readString(value, 'gigThumbnailUrl') ?? '',
    buyerId: readString(value, 'buyerId') ?? '',
    buyerUsername: readString(value, 'buyerUsername') ?? 'unknown-buyer',
    buyerAvatarUrl: readString(value, 'buyerAvatarUrl') ?? '',
    sellerId: readString(value, 'sellerId') ?? '',
    tier: readEnum<PackageTier>(value, 'tier', PACKAGE_TIERS, 'basic'),
    status,
    amountCents,
    serviceFeeCents: readNumber(value, 'serviceFeeCents'),
    netRevenueCents: readNumber(value, 'netRevenueCents', amountCents),
    startDate: readIsoString(value, 'startDate', createdAt),
    dueDate: readIsoString(value, 'dueDate', createdAt),
    deliveredAt: typeof value.deliveredAt === 'string' ? readIsoString(value, 'deliveredAt', FALLBACK_ISO) : undefined,
    completedAt: typeof value.completedAt === 'string' ? readIsoString(value, 'completedAt', FALLBACK_ISO) : undefined,
    requirements,
    milestones: Array.isArray(value.milestones)
      ? value.milestones.filter(isRecord).map((milestone, index) => ({
          id: readString(milestone, 'id') ?? `${id}-ms-${index + 1}`,
          title: readString(milestone, 'title') ?? `Milestone ${index + 1}`,
          dueDate: readIsoString(milestone, 'dueDate', createdAt),
          isCompleted: readBoolean(milestone, 'isCompleted'),
        }))
      : [],
    deliveryFiles: Array.isArray(value.deliveryFiles)
      ? value.deliveryFiles.filter(isRecord).map((file, index) => ({
          name: readString(file, 'name') ?? `file-${index + 1}`,
          url: readString(file, 'url') ?? '',
          sizeBytes: readNumber(file, 'sizeBytes'),
          mimeType: readString(file, 'mimeType') ?? 'application/octet-stream',
        }))
      : [],
    revisionCountTotal: Math.max(0, readNumber(value, 'revisionCountTotal')),
    revisionCountRemaining: Math.max(0, readNumber(value, 'revisionCountRemaining')),
    createdAt,
    updatedAt: readIsoString(value, 'updatedAt', createdAt),
  };
}

export function sanitizeOrderCollection(value: unknown): SanitizeResult<OrderItem[]> {
  if (!Array.isArray(value)) {
    return { value: [], recovered: 0, discarded: value === undefined || value === null ? 0 : 1 };
  }
  const orders: OrderItem[] = [];
  let discarded = 0;
  value.forEach((entry) => {
    const order = sanitizeOrder(entry);
    if (order) {
      orders.push(order);
    } else {
      discarded += 1;
    }
  });
  return { value: orders, recovered: orders.length, discarded };
}

export function sanitizeUserProfile(value: unknown, fallback: UserProfile): UserProfile {
  if (!isRecord(value)) {
    return fallback;
  }
  const id = readString(value, 'id');
  if (!id) {
    return fallback;
  }
  return {
    id,
    username: readString(value, 'username') ?? fallback.username,
    displayName: readString(value, 'displayName') ?? fallback.displayName,
    avatarUrl: readString(value, 'avatarUrl') ?? fallback.avatarUrl,
    title: readString(value, 'title') ?? fallback.title,
    level: readEnum<SellerLevel>(value, 'level', SELLER_LEVELS, fallback.level),
    rating: readNumber(value, 'rating', fallback.rating),
    ratingCount: readNumber(value, 'ratingCount', fallback.ratingCount),
    completedOrdersCount: Math.max(0, readNumber(value, 'completedOrdersCount', fallback.completedOrdersCount)),
    country: readString(value, 'country') ?? fallback.country,
    memberSince: readIsoString(value, 'memberSince', fallback.memberSince),
    responseRatePercent: readNumber(value, 'responseRatePercent', fallback.responseRatePercent),
    responseTimeHours: readNumber(value, 'responseTimeHours', fallback.responseTimeHours),
    onTimeDeliveryPercent: readNumber(value, 'onTimeDeliveryPercent', fallback.onTimeDeliveryPercent),
    orderCompletionPercent: readNumber(value, 'orderCompletionPercent', fallback.orderCompletionPercent),
    totalEarnedCents: Math.max(0, readNumber(value, 'totalEarnedCents', fallback.totalEarnedCents)),
    availableBalanceCents: Math.max(0, readNumber(value, 'availableBalanceCents', fallback.availableBalanceCents)),
    pendingClearanceCents: Math.max(0, readNumber(value, 'pendingClearanceCents', fallback.pendingClearanceCents)),
  };
}

export function sanitizeLedgerEntry(value: unknown): LedgerEntry | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = readString(value, 'id');
  const orderNumber = readString(value, 'orderNumber');
  const netCents = readNumber(value, 'netCents', -1);
  if (!id || !orderNumber || netCents < 0) {
    return null;
  }
  return {
    id,
    orderNumber,
    gigTitle: readString(value, 'gigTitle') ?? 'Untitled gig',
    grossCents: readNumber(value, 'grossCents', netCents),
    feeCents: readNumber(value, 'feeCents'),
    netCents,
    createdAt: readIsoString(value, 'createdAt', FALLBACK_ISO),
    availableAt: readIsoString(value, 'availableAt', FALLBACK_ISO),
    status: readEnum<LedgerEntry['status']>(value, 'status', ['available', 'pending_clearance', 'paid_out', 'refunded'], 'available'),
    method: readString(value, 'method') ?? '—',
  };
}

export function sanitizeLedgerCollection(value: unknown): SanitizeResult<LedgerEntry[]> {
  if (!Array.isArray(value)) {
    return { value: [], recovered: 0, discarded: value === undefined || value === null ? 0 : 1 };
  }
  const entries: LedgerEntry[] = [];
  let discarded = 0;
  value.forEach((entry) => {
    const sanitized = sanitizeLedgerEntry(entry);
    if (sanitized) {
      entries.push(sanitized);
    } else {
      discarded += 1;
    }
  });
  return { value: entries, recovered: entries.length, discarded };
}

export function sanitizeNotification(value: unknown): NotificationItem | null {
  if (!isRecord(value)) {
    return null;
  }
  const id = readString(value, 'id');
  const title = readString(value, 'title');
  if (!id || !title) {
    return null;
  }
  return {
    id,
    kind: readEnum<NotificationKind>(value, 'kind', ['order', 'revision', 'payout', 'system'], 'system'),
    title,
    body: readString(value, 'body') ?? '',
    createdAt: readIsoString(value, 'createdAt', FALLBACK_ISO),
    isRead: readBoolean(value, 'isRead'),
  };
}

export function sanitizeNotificationCollection(value: unknown): SanitizeResult<NotificationItem[]> {
  if (!Array.isArray(value)) {
    return { value: [], recovered: 0, discarded: value === undefined || value === null ? 0 : 1 };
  }
  const entries: NotificationItem[] = [];
  let discarded = 0;
  value.forEach((entry) => {
    const sanitized = sanitizeNotification(entry);
    if (sanitized) {
      entries.push(sanitized);
    } else {
      discarded += 1;
    }
  });
  return { value: entries, recovered: entries.length, discarded };
}

/* -------------------------------------------------------------------------- */
/* Raw storage inspection                                                      */
/* -------------------------------------------------------------------------- */

export type RawReadState = 'missing' | 'invalid-json' | 'valid';

export function readRawStorageValue(key: string): { state: RawReadState; value: unknown } {
  if (typeof window === 'undefined') {
    return { state: 'missing', value: undefined };
  }
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch (error) {
    console.error(`Storage read error for key: ${key}`, error);
    return { state: 'invalid-json', value: undefined };
  }
  if (raw === null) {
    return { state: 'missing', value: undefined };
  }
  try {
    return { state: 'valid', value: JSON.parse(raw) as unknown };
  } catch {
    return { state: 'invalid-json', value: undefined };
  }
}

export function isStorageWritable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    const probeKey = `${STORAGE_KEYS.profile}:probe`;
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Full runtime sanity check over every persisted collection.
 * Used at boot to decide between persisted state, repaired state and seed data.
 */
export function inspectStorageHealth(): StorageIntegrityReport[] {
  const gigs = readRawStorageValue(STORAGE_KEYS.gigs);
  const orders = readRawStorageValue(STORAGE_KEYS.orders);
  const ledger = readRawStorageValue(STORAGE_KEYS.ledger);
  const notifications = readRawStorageValue(STORAGE_KEYS.notifications);
  const profile = readRawStorageValue(STORAGE_KEYS.profile);

  const buildReport = (key: string, raw: { state: RawReadState; value: unknown }, recordCount: number, sanitized: SanitizeResult<unknown> | null): StorageIntegrityReport => {
    if (raw.state === 'missing') {
      return {
        key,
        status: 'empty',
        validRecords: 0,
        recoveredRecords: 0,
        discardedRecords: 0,
        message: 'No persisted state found — seed dataset will be used.',
      };
    }
    if (raw.state === 'invalid-json') {
      return {
        key,
        status: 'corrupted',
        validRecords: 0,
        recoveredRecords: 0,
        discardedRecords: 1,
        message: 'Stored payload is not valid JSON — key ignored and reseeded.',
      };
    }
    if (!Array.isArray(raw.value)) {
      return {
        key,
        status: 'corrupted',
        validRecords: 0,
        recoveredRecords: 0,
        discardedRecords: 1,
        message: `Expected an array payload, received ${typeof raw.value} — key ignored and reseeded.`,
      };
    }
    const discarded = sanitized?.discarded ?? 0;
    return {
      key,
      status: discarded > 0 ? 'recovered' : 'healthy',
      validRecords: recordCount,
      recoveredRecords: sanitized?.recovered ?? 0,
      discardedRecords: discarded,
      message:
        discarded > 0
          ? `${discarded} malformed record(s) dropped, ${recordCount} restored.`
          : `${recordCount} record(s) loaded intact.`,
    };
  };

  const gigsSanitized = gigs.state === 'valid' ? sanitizeGigCollection(gigs.value) : null;
  const ordersSanitized = orders.state === 'valid' ? sanitizeOrderCollection(orders.value) : null;
  const ledgerSanitized = ledger.state === 'valid' ? sanitizeLedgerCollection(ledger.value) : null;
  const notificationsSanitized = notifications.state === 'valid' ? sanitizeNotificationCollection(notifications.value) : null;

  return [
    buildReport(STORAGE_KEYS.gigs, gigs, Array.isArray(gigs.value) ? gigs.value.length : 0, gigsSanitized),
    buildReport(STORAGE_KEYS.orders, orders, Array.isArray(orders.value) ? orders.value.length : 0, ordersSanitized),
    buildReport(STORAGE_KEYS.ledger, ledger, Array.isArray(ledger.value) ? ledger.value.length : 0, ledgerSanitized),
    buildReport(
      STORAGE_KEYS.notifications,
      notifications,
      Array.isArray(notifications.value) ? notifications.value.length : 0,
      notificationsSanitized
    ),
    profile.state === 'missing'
      ? {
          key: STORAGE_KEYS.profile,
          status: 'empty',
          validRecords: 0,
          recoveredRecords: 0,
          discardedRecords: 0,
          message: 'No persisted profile found — seed profile will be used.',
        }
      : profile.state === 'invalid-json'
        ? {
            key: STORAGE_KEYS.profile,
            status: 'corrupted',
            validRecords: 0,
            recoveredRecords: 0,
            discardedRecords: 1,
            message: 'Stored profile is not valid JSON — seed profile will be used.',
          }
        : (() => {
            const recordCount = isRecord(profile.value) ? 1 : 0;
            return {
              key: STORAGE_KEYS.profile,
              status: recordCount === 1 ? ('healthy' as const) : ('corrupted' as const),
              validRecords: recordCount,
              recoveredRecords: recordCount,
              discardedRecords: recordCount === 1 ? 0 : 1,
              message: recordCount === 1 ? 'Profile loaded intact.' : 'Stored profile has an unexpected shape — seed profile will be used.',
            };
          })(),
  ];
}

/** Removes keys whose payload cannot be parsed so the next boot starts clean. */
export function purgeCorruptedStorageKeys(): string[] {
  const purged: string[] = [];
  if (typeof window === 'undefined') {
    return purged;
  }
  (Object.values(STORAGE_KEYS) as string[]).forEach((key) => {
    const raw = readRawStorageValue(key);
    if (raw.state === 'invalid-json') {
      try {
        window.localStorage.removeItem(key);
        purged.push(key);
      } catch (error) {
        console.error(`Storage purge error for key: ${key}`, error);
      }
    }
  });
  return purged;
}