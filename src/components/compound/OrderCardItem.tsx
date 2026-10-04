import { ChevronRight, RefreshCcw } from 'lucide-react';
import { Avatar } from '../primitives/Avatar';
import { Badge, OrderStatusBadge } from '../primitives/Badge';
import { PACKAGE_TIER_LABELS, ORDER_STATUS_TRANSITIONS, type OrderItem, type OrderStatus } from '../../types/marketplace';
import { cn } from '../../utils/cn';
import { formatCentsToUsd } from '../../utils/currency';
import { CountdownClock } from './CountdownClock';

const PRIMARY_TRANSITION: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  pending_requirements: { status: 'in_progress', label: 'Start work' },
  in_progress: { status: 'delivered', label: 'Deliver work' },
  delivered: { status: 'completed', label: 'Mark complete' },
  revision: { status: 'delivered', label: 'Send revision' },
};

export interface OrderCardItemProps {
  order: OrderItem;
  onTransition?: (orderId: string, status: OrderStatus) => void;
  onOpen?: (order: OrderItem) => void;
  /** Renders the CTA as a full-width block for thumb reach. */
  fullWidthAction?: boolean;
  className?: string;
}

/**
 * Stacked mobile order card (< 768px): countdown badge, client identity,
 * commercial summary and a full-width primary action.
 */
export function OrderCardItem({
  order,
  onTransition,
  onOpen,
  fullWidthAction = true,
  className,
}: OrderCardItemProps): React.JSX.Element {
  const transition = PRIMARY_TRANSITION[order.status];
  const canTransition = transition !== undefined && ORDER_STATUS_TRANSITIONS[order.status].includes(transition.status);
  const unanswered = order.requirements.filter((requirement) => !requirement.isAnswered).length;

  return (
    <article
      data-testid={`order-card-${order.id}`}
      data-order-status={order.status}
      className={cn(
        'flex flex-col gap-3 rounded-2xl border border-slate-700/70 bg-slate-800/50 p-4 transition-colors',
        order.status === 'revision' && 'border-rose-500/40',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <img
            src={order.gigThumbnailUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-12 shrink-0 rounded-xl border border-slate-700 object-cover"
          />
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onOpen?.(order)}
              className="block min-h-[44px] w-full text-left"
            >
              <span className="tabular block text-[11px] font-semibold tracking-wide text-slate-400">
                {order.orderNumber}
              </span>
              <span className="line-clamp-2 block text-sm font-semibold text-white">{order.gigTitle}</span>
            </button>
          </div>
        </div>
        <CountdownClock dueDateIsoString={order.dueDate} status={order.status} size="sm" hideLabel />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <OrderStatusBadge status={order.status} size="md" />
        <Badge tone="neutral" size="md">
          {PACKAGE_TIER_LABELS[order.tier]}
        </Badge>
        {unanswered > 0 ? (
          <Badge tone="warning" size="md">
            {unanswered} unanswered
          </Badge>
        ) : null}
        {order.revisionCountRemaining > 0 ? (
          <Badge tone="info" size="md" icon={<RefreshCcw aria-hidden="true" className="size-3" />}>
            {order.revisionCountRemaining} revisions left
          </Badge>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-700/60 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar src={order.buyerAvatarUrl} name={order.buyerUsername} size="sm" presence="online" />
          <div className="min-w-0">
            <p className="truncate text-xs text-slate-400">Buyer</p>
            <p className="truncate text-sm font-medium text-slate-200">{order.buyerUsername}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Order value</p>
          <p className="tabular text-base font-bold text-white">{formatCentsToUsd(order.amountCents)}</p>
        </div>
      </div>

      {canTransition && transition ? (
        <button
          type="button"
          onClick={() => onTransition?.(order.id, transition.status)}
          className={cn(
            'inline-flex min-h-[48px] items-center justify-center gap-1 rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400',
            fullWidthAction && 'w-full'
          )}
        >
          {transition.label}
          <ChevronRight aria-hidden="true" className="size-4" />
        </button>
      ) : (
        <p className="rounded-xl bg-slate-900/60 px-4 py-3 text-center text-xs text-slate-500">
          {ORDER_STATUS_TRANSITIONS[order.status].length === 0
            ? 'This order has reached a terminal state.'
            : 'No pending action for this order.'}
        </p>
      )}
    </article>
  );
}