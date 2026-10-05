import { ChevronRight, RefreshCcw } from 'lucide-react';
import { Avatar } from '../primitives/Avatar';
import { Badge, OrderStatusBadge } from '../primitives/Badge';
import { PACKAGE_TIER_LABELS, type OrderItem, type OrderStatus } from '../../types/marketplace';
import { cn } from '../../utils/cn';
import { formatCentsToUsd } from '../../utils/currency';
import { formatShortDate } from '../../utils/date';
import { ORDER_STATUS_TRANSITIONS } from '../../types/marketplace';
import { CountdownClock } from './CountdownClock';
import { resolvePrimaryTransition, canBuyerRequestRevision } from '../../context/MarketplaceContext';

/** Statuses whose countdown badge stays visible in dense desktop rows. */
const COUNTDOWN_STATUSES: readonly OrderStatus[] = ['pending_requirements', 'in_progress', 'delivered', 'revision'];

export interface OrderRowItemProps {
  order: OrderItem;
  /** Persona the row is rendered for; drives which CTAs are offered. */
  audience: 'seller' | 'buyer';
  /** Counterparty shown to the current persona (buyer for sellers, seller for buyers). */
  counterpartyName?: string;
  /** Applies a lifecycle transition; receives the target status. */
  onTransition?: (orderId: string, status: OrderStatus) => void;
  /** Opens the buyer-side revision request. */
  onRequestRevision?: (orderId: string) => void;
  /** Opens the full order workspace. */
  onOpen?: (order: OrderItem) => void;
  /** Marks the row as the currently inspected order. */
  isActive?: boolean;
  className?: string;
}

/**
 * High density desktop ledger row (rendered at >= 768px).
 *
 * Buyer, service fee and start date columns collapse between 768px and 1023px,
 * leaving a four column table that still carries order, status, amount and CTA.
 */
export function OrderRowItem({
  order,
  audience,
  counterpartyName,
  onTransition,
  onRequestRevision,
  onOpen,
  isActive = false,
  className,
}: OrderRowItemProps): React.JSX.Element {
  const transition = resolvePrimaryTransition(order, audience);
  const canTransition = transition !== undefined && ORDER_STATUS_TRANSITIONS[order.status].includes(transition.status);
  const canRequestRevision = audience === 'buyer' && canBuyerRequestRevision(order);
  const answered = order.requirements.filter((requirement) => requirement.isAnswered).length;
  const showCountdown = COUNTDOWN_STATUSES.includes(order.status);
  const showNetColumn = audience === 'seller';

  return (
    <tr
      data-testid={`order-row-${order.id}`}
      data-order-status={order.status}
      className={cn(
        'border-b border-slate-800/80 transition-colors last:border-b-0 hover:bg-slate-800/40',
        isActive && 'bg-emerald-500/5',
        className
      )}
    >
      <th scope="row" className="px-3 py-3 text-left align-middle font-normal">
        <button
          type="button"
          onClick={() => onOpen?.(order)}
          data-testid={`order-open-${order.id}`}
          className="flex min-h-[44px] w-full min-w-[200px] items-center gap-3 rounded-lg text-left"
        >
          <img
            src={order.gigThumbnailUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-11 shrink-0 rounded-lg border border-slate-700 object-cover"
          />
          <span className="min-w-0">
            <span className="tabular block text-xs font-semibold text-slate-400">{order.orderNumber}</span>
            <span className="block truncate text-sm font-medium text-white">{order.gigTitle}</span>
            <span className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
              <Badge tone="neutral" size="sm">
                {PACKAGE_TIER_LABELS[order.tier]}
              </Badge>
              <span className="tabular">
                {answered}/{order.requirements.length} requirements
              </span>
            </span>
          </span>
        </button>
      </th>

      <td className="hidden px-3 py-3 align-middle xl:table-cell">
        {showNetColumn ? (
          <span className="flex items-center gap-2">
            <Avatar src={order.buyerAvatarUrl} name={order.buyerUsername} size="sm" />
            <span className="truncate text-sm text-slate-300">{order.buyerUsername}</span>
          </span>
        ) : (
          <Badge tone="brand" size="sm">
            {counterpartyName ?? 'Your purchase'}
          </Badge>
        )}
      </td>

      <td className="hidden px-3 py-3 align-middle lg:table-cell">
        <span className="text-sm text-slate-300">{formatShortDate(order.startDate)}</span>
      </td>

      <td className="px-3 py-3 align-middle">
        <OrderStatusBadge status={order.status} size="md" />
      </td>

      <td className="px-3 py-3 align-middle">
        <div className="flex flex-col gap-1">
          <span className="tabular text-sm font-semibold text-white">{formatCentsToUsd(order.amountCents)}</span>
          <span className="tabular hidden text-[11px] text-slate-500 lg:block">
            fee {formatCentsToUsd(order.serviceFeeCents)}
          </span>
        </div>
      </td>

      <td className="px-3 py-3 align-middle">
        {showCountdown ? (
          <CountdownClock dueDateIsoString={order.dueDate} status={order.status} size="sm" />
        ) : (
          <span className="text-xs text-slate-500">{formatShortDate(order.dueDate)}</span>
        )}
      </td>

      <td className="px-3 py-3 text-right align-middle">
        <div className="flex items-center justify-end gap-2">
          {order.revisionCountRemaining > 0 && showNetColumn ? (
            <span className="tabular hidden items-center gap-1 text-[11px] text-slate-500 md:inline-flex">
              <RefreshCcw aria-hidden="true" className="size-3" />
              {order.revisionCountRemaining} left
            </span>
          ) : null}
          {canRequestRevision ? (
            <button
              type="button"
              onClick={() => onRequestRevision?.(order.id)}
              data-testid={`order-revision-${order.id}`}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-amber-500/40 px-3 text-xs font-semibold text-amber-200 transition-colors hover:bg-amber-500/10"
            >
              Request revision
            </button>
          ) : null}
          {canTransition && transition ? (
            <button
              type="button"
              onClick={() => onTransition?.(order.id, transition.status)}
              data-testid={`order-action-${order.id}`}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-emerald-500/40 px-3 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/10"
            >
              {transition.label}
              <ChevronRight aria-hidden="true" className="size-3.5" />
            </button>
          ) : (
            <span className="inline-flex min-h-[44px] items-center px-2 text-xs text-slate-500">
              {ORDER_STATUS_TRANSITIONS[order.status].length === 0 ? 'Terminal' : 'No action'}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}