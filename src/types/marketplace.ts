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
