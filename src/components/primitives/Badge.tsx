import type { ReactNode } from 'react';
import {
  GIG_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  SELLER_LEVEL_LABELS,
  type GigItem,
  type OrderStatus,
  type SellerLevel,
} from '../../types/marketplace';
import { cn } from '../../utils/cn';

export type BadgeTone = 'neutral' | 'brand' | 'warning' | 'danger' | 'info' | 'success' | 'outline';
export type BadgeSize = 'sm' | 'md';

const TONE_STYLES: Record<BadgeTone, string> = {
  neutral: 'border-slate-600/70 bg-slate-700/40 text-slate-300',
  brand: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  success: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  warning: 'border-amber-400/40 bg-amber-400/15 text-amber-300',
  danger: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
  info: 'border-sky-400/40 bg-sky-400/15 text-sky-300',
  outline: 'border-slate-600 bg-transparent text-slate-400',
};

const SIZE_STYLES: Record<BadgeSize, string> = {
  sm: 'text-[11px] px-2 py-0.5 gap-1',
  md: 'text-xs px-2.5 py-1 gap-1.5',
};

export interface BadgeProps {
  tone?: BadgeTone;
  size?: BadgeSize;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
  testId?: string;
}

/** Generic tag/status pill used for counts, tiers and inline metadata. */
export function Badge({
  tone = 'neutral',
  size = 'md',
  icon,
  className,
  children,
  testId,
}: BadgeProps): React.JSX.Element {
  return (
    <span
      data-testid={testId}
      className={cn(
        'inline-flex items-center rounded-full border font-medium leading-tight whitespace-nowrap',
        TONE_STYLES[tone],
        SIZE_STYLES[size],
        className
      )}
    >
      {icon ? <span aria-hidden="true" className="inline-flex items-center">{icon}</span> : null}
      {children}
    </span>
  );
}

const SELLER_LEVEL_TONES: Record<SellerLevel, BadgeTone> = {
  new_seller: 'outline',
  level_one: 'info',
  level_two: 'brand',
  top_rated: 'warning',
};

export interface SellerLevelBadgeProps {
  level: SellerLevel;
  size?: BadgeSize;
  className?: string;
}

/** Seller tier indicator derived from `SellerLevel`. */
export function SellerLevelBadge({ level, size = 'sm', className }: SellerLevelBadgeProps): React.JSX.Element {
  return (
    <Badge
      tone={SELLER_LEVEL_TONES[level]}
      size={size}
      className={className}
      testId={`seller-level-${level}`}
    >
      {SELLER_LEVEL_LABELS[level]}
    </Badge>
  );
}

const ORDER_STATUS_TONES: Record<OrderStatus, BadgeTone> = {
  pending_requirements: 'warning',
  in_progress: 'info',
  delivered: 'brand',
  revision: 'danger',
  completed: 'success',
  cancelled: 'neutral',
};

export interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: BadgeSize;
  className?: string;
}

/** Order lifecycle pill, colour mapped to `OrderStatus`. */
export function OrderStatusBadge({ status, size = 'sm', className }: OrderStatusBadgeProps): React.JSX.Element {
  return (
    <Badge tone={ORDER_STATUS_TONES[status]} size={size} className={className} testId={`order-status-${status}`}>
      {ORDER_STATUS_LABELS[status]}
    </Badge>
  );
}

const GIG_STATUS_TONES: Record<GigItem['status'], BadgeTone> = {
  active: 'success',
  paused: 'warning',
  deleted: 'danger',
};

export interface GigStatusBadgeProps {
  status: GigItem['status'];
  size?: BadgeSize;
  className?: string;
}

/** Active/paused/deleted state for a gig listing. */
export function GigStatusBadge({ status, size = 'sm', className }: GigStatusBadgeProps): React.JSX.Element {
  return (
    <Badge tone={GIG_STATUS_TONES[status]} size={size} className={className} testId={`gig-status-${status}`}>
      {GIG_STATUS_LABELS[status]}
    </Badge>
  );
}