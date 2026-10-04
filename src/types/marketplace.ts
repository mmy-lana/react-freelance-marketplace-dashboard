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
  maxSizeBytes: 104857600,
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

/* -------------------------------------------------------------------------- */
/* Display metadata                                                            */
/* -------------------------------------------------------------------------- */

export const GIG_CATEGORIES = [
  'Graphics & Design',
  'Digital Marketing',
  'Writing & Translation',
  'Video & Animation',
  'Music & Audio',
  'Programming & Tech',
  'AI Services',
] as const satisfies readonly GigCategory[];

export const SELLER_LEVELS = ['new_seller', 'level_one', 'level_two', 'top_rated'] as const satisfies readonly SellerLevel[];

export const ORDER_STATUSES = [
  'pending_requirements',
  'in_progress',
  'delivered',
  'revision',
  'completed',
  'cancelled',
] as const satisfies readonly OrderStatus[];

export const PACKAGE_TIERS = ['basic', 'standard', 'premium'] as const satisfies readonly PackageTier[];

export const SELLER_LEVEL_LABELS: Record<SellerLevel, string> = {
  new_seller: 'New Seller',
  level_one: 'Level 1',
  level_two: 'Level 2',
  top_rated: 'Top Rated',
};

export const SELLER_LEVEL_DESCRIPTIONS: Record<SellerLevel, string> = {
  new_seller: 'Building a track record',
  level_one: 'Rising seller',
  level_two: 'Established seller',
  top_rated: 'Highest tier seller',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_requirements: 'Pending Requirements',
  in_progress: 'In Progress',
  delivered: 'Delivered',
  revision: 'Revision Requested',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PACKAGE_TIER_LABELS: Record<PackageTier, string> = {
  basic: 'Basic',
  standard: 'Standard',
  premium: 'Premium',
};

export const GIG_STATUS_LABELS: Record<GigItem['status'], string> = {
  active: 'Active',
  paused: 'Paused',
  deleted: 'Deleted',
};

/** Ordered lifecycle stages rendered by the order timeline tracker. */
export const ORDER_TIMELINE_STAGES = [
  'pending_requirements',
  'in_progress',
  'delivered',
  'completed',
] as const satisfies readonly OrderStatus[];

export type OrderTimelineStage = (typeof ORDER_TIMELINE_STAGES)[number];

/* -------------------------------------------------------------------------- */
/* Supporting domain records                                                   */
/* -------------------------------------------------------------------------- */

export type LedgerEntryStatus = 'available' | 'pending_clearance' | 'paid_out' | 'refunded';

export interface LedgerEntry {
  id: string;
  orderNumber: string;
  gigTitle: string;
  grossCents: number;
  feeCents: number;
  netCents: number;
  createdAt: string;
  availableAt: string;
  status: LedgerEntryStatus;
  method: string;
}

/** A single plotted sample used by metric sparklines. */
export interface MetricSeriesPoint {
  label: string;
  value: number;
}

export type NotificationKind = 'order' | 'revision' | 'payout' | 'system';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
}

export type SellerMode = 'seller' | 'buyer';

export type AppView = 'explorer' | 'dashboard' | 'orders' | 'earnings' | 'profile';

/** Result envelope returned by every asynchronous marketplace mutation. */
export interface MutationResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
