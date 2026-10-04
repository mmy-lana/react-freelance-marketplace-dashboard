import { Paperclip, RefreshCcw, Send, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { CountdownClock } from '../compound/CountdownClock';
import { OrderCardItem } from '../compound/OrderCardItem';
import { OrderRowItem } from '../compound/OrderRowItem';
import { OrderTimelineTracker } from '../compound/OrderTimelineTracker';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import { Modal } from '../primitives/Modal';
import { Tabs, type TabItem } from '../primitives/Tabs';
import { useMarketplace, type DeliveryFileInput } from '../../context/MarketplaceContext';
import { useToast } from '../../context/ToastContext';
import {
  DELIVERY_CONSTRAINTS,
  ORDER_STATUS_LABELS,
  type OrderItem,
  type OrderStatus,
} from '../../types/marketplace';
import { cn } from '../../utils/cn';
import { formatCentsToUsd } from '../../utils/currency';
import { formatDeliveryDays, formatRelativeTime } from '../../utils/date';

type QueueTab = 'active' | 'completed' | 'cancelled' | 'all';

const ACTIVE_STATUSES: readonly OrderStatus[] = ['pending_requirements', 'in_progress', 'delivered', 'revision'];

const TAB_MATCHERS: Record<QueueTab, (order: OrderItem) => boolean> = {
  active: (order) => ACTIVE_STATUSES.includes(order.status),
  completed: (order) => order.status === 'completed',
  cancelled: (order) => order.status === 'cancelled',
  all: () => true,
};

export interface OrderManagementQueueProps {
  /** Restricts the queue to a subset of orders (e.g. seller-owned only). */
  orders?: OrderItem[];
  title?: string;
  /** Hides the tab switcher when the host view already filters the list. */
  hideTabs?: boolean;
  className?: string;
}

/**
 * Responsive order lifecycle queue.
 *
 * Renders `OrderRowItem` rows from 768px up and `OrderCardItem` cards below it,
 * with delivery and revision dialogs wired to the guarded context mutations.
 */
export function OrderManagementQueue({
  orders,
  title = 'Order queue',
  hideTabs = false,
  className,
}: OrderManagementQueueProps): React.JSX.Element {
  const { orders: allOrders, updateOrderStatus, deliverOrder, requestRevision } = useMarketplace();
  const { pushToast } = useToast();

  const [activeTab, setActiveTab] = useState<QueueTab>('active');
  const [deliveryOrder, setDeliveryOrder] = useState<OrderItem | null>(null);
  const [revisionOrder, setRevisionOrder] = useState<OrderItem | null>(null);
  const [revisionNote, setRevisionNote] = useState('');
  const [revisionError, setRevisionError] = useState<string | undefined>(undefined);
  const [pendingFiles, setPendingFiles] = useState<DeliveryFileInput[]>([]);
  const [deliveryError, setDeliveryError] = useState<string | undefined>(undefined);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const source = orders ?? allOrders;
  const visibleOrders = useMemo(() => source.filter(TAB_MATCHERS[activeTab]), [source, activeTab]);

  const tabItems = useMemo<TabItem<QueueTab>[]>(
    () => [
      { id: 'active', label: 'Active', badgeCount: source.filter(TAB_MATCHERS.active).length },
      { id: 'completed', label: 'Completed', badgeCount: source.filter(TAB_MATCHERS.completed).length },
      { id: 'cancelled', label: 'Cancelled', badgeCount: source.filter(TAB_MATCHERS.cancelled).length },
      { id: 'all', label: 'All', badgeCount: source.length },
    ],
    [source]
  );

  const handleFileSelection = (fileList: FileList | null): void => {
    if (!fileList) {
      return;
    }
    const files = Array.from(fileList).map((file) => ({
      name: file.name,
      sizeBytes: file.size,
      mimeType: file.type.length > 0 ? file.type : 'application/octet-stream',
    }));
    setPendingFiles(files);
    setDeliveryError(undefined);
  };

  const handleDeliver = (): void => {
    if (!deliveryOrder) {
      return;
    }
    const result = deliverOrder(deliveryOrder.id, pendingFiles);
    if (!result.ok) {
      setDeliveryError(result.error ?? 'The delivery could not be processed.');
      return;
    }
    setDeliveryOrder(null);
    setPendingFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRevision = (): void => {
    if (!revisionOrder) {
      return;
    }
    if (revisionNote.trim().length < 10) {
      setRevisionError('Describe the change request in at least 10 characters.');
      return;
    }
    const result = requestRevision(revisionOrder.id, revisionNote);
    if (!result.ok) {
      setRevisionError(result.error ?? 'The revision could not be requested.');
      return;
    }
    setRevisionNote('');
    setRevisionError(undefined);
    setRevisionOrder(null);
  };

  const handleTransition = (orderId: string, status: OrderStatus): void => {
    const order = source.find((candidate) => candidate.id === orderId);
    if (!order) {
      pushToast({ tone: 'error', title: 'Order unavailable', description: 'That order is no longer in the queue.' });
      return;
    }

    // Delivering always routes through the upload dialog so the delivery
    // constraints are validated before the status machine moves forward.
    if (status === 'delivered' && (order.status === 'in_progress' || order.status === 'revision')) {
      setDeliveryOrder(order);
      setPendingFiles([]);
      setDeliveryError(undefined);
      return;
    }

    const result = updateOrderStatus(orderId, status);
    if (!result.ok) {
      pushToast({ tone: 'error', title: 'Transition blocked', description: result.error });
    }
  };

  const totalValue = visibleOrders.reduce((sum, order) => sum + order.netRevenueCents, 0);

  return (
    <section data-testid="order-queue" className={cn('w-full', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <p className="text-xs text-slate-400">
            <span className="tabular" data-testid="queue-count">
              {visibleOrders.length}
            </span>{' '}
            orders · {formatCentsToUsd(totalValue)} net revenue
          </p>
        </div>
        {hideTabs ? null : (
          <Tabs
            items={tabItems}
            activeId={activeTab}
            onChange={setActiveTab}
            ariaLabel="Order status filter"
            size="sm"
            testId="queue-tabs"
          />
        )}
      </div>

      {visibleOrders.length === 0 ? (
        <div
          data-testid="queue-empty-state"
          className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-800/30 px-6 py-12 text-center"
        >
          <Send aria-hidden="true" className="size-9 text-slate-600" />
          <h3 className="text-sm font-semibold text-white">Nothing in this queue</h3>
          <p className="max-w-sm text-xs text-slate-400">
            Orders appear here as soon as a buyer purchases one of your gigs.
          </p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-700/70 md:block">
            <table className="w-full min-w-[720px] border-collapse">
              <caption className="sr-only">Orders matching the selected status filter</caption>
              <thead>
                <tr className="border-b border-slate-700/70 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-3 py-3 font-medium">
                    Order
                  </th>
                  <th scope="col" className="hidden px-3 py-3 font-medium xl:table-cell">
                    Buyer
                  </th>
                  <th scope="col" className="hidden px-3 py-3 font-medium lg:table-cell">
                    Started
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Amount
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Deadline
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleOrders.map((order) => (
                  <OrderRowItem key={order.id} order={order} onTransition={handleTransition} onOpen={() => setExpandedOrderId(order.id)} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {visibleOrders.map((order) => (
              <OrderCardItem key={order.id} order={order} onTransition={handleTransition} onOpen={() => setExpandedOrderId(order.id)} />
            ))}
          </div>

          {expandedOrderId ? (
            <OrderDetailPanel
              order={visibleOrders.find((order) => order.id === expandedOrderId) ?? null}
              onClose={() => setExpandedOrderId(null)}
              onRequestRevision={(order) => {
                setExpandedOrderId(null);
                setRevisionOrder(order);
                setRevisionNote('');
                setRevisionError(undefined);
              }}
            />
          ) : null}
        </>
      )}

      <Modal
        isOpen={deliveryOrder !== null}
        onClose={() => {
          setDeliveryOrder(null);
          setPendingFiles([]);
          setDeliveryError(undefined);
        }}
        title={deliveryOrder ? `Deliver ${deliveryOrder.orderNumber}` : 'Deliver order'}
        description={`Up to ${DELIVERY_CONSTRAINTS.maxFiles} files · ${Math.round(
          DELIVERY_CONSTRAINTS.maxSizeBytes / 1024 / 1024
        )}MB total · ZIP, PDF, PNG, JPEG, SVG or MP4`}
        size="lg"
        testId="delivery-modal"
        footer={
          <>
            <Button
              variant="ghost"
              testId="delivery-cancel"
              onClick={() => {
                setDeliveryOrder(null);
                setPendingFiles([]);
                setDeliveryError(undefined);
              }}
            >
              Cancel
            </Button>
            <Button testId="delivery-submit" onClick={handleDeliver}>
              Send delivery
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor="delivery-files"
              className="mb-1.5 block text-sm font-medium text-slate-300"
            >
              Attach delivery files
            </label>
            <div className="rounded-xl border border-dashed border-slate-600 bg-slate-900/60 p-4 text-center">
              <Upload aria-hidden="true" className="mx-auto mb-2 size-6 text-slate-500" />
              <input
                id="delivery-files"
                data-testid="delivery-file-input"
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(event) => handleFileSelection(event.target.files)}
                className="block w-full text-xs text-slate-400 file:mr-3 file:min-h-[44px] file:rounded-lg file:border-0 file:bg-slate-700 file:px-4 file:text-sm file:font-medium file:text-slate-100"
              />
            </div>
          </div>

          {pendingFiles.length > 0 ? (
            <ul className="space-y-2" data-testid="delivery-file-list">
              {pendingFiles.map((file) => {
                const mimeAllowed = (DELIVERY_CONSTRAINTS.allowedMimeTypes as readonly string[]).includes(file.mimeType);
                return (
                  <li
                    key={file.name}
                    className={cn(
                      'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs',
                      mimeAllowed ? 'border-slate-700 bg-slate-800/60 text-slate-300' : 'border-rose-500/50 bg-rose-500/10 text-rose-200'
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Paperclip aria-hidden="true" className="size-3.5 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </span>
                    <span className="tabular shrink-0">
                      {(file.sizeBytes / 1024 / 1024).toFixed(2)}MB · {mimeAllowed ? file.mimeType : 'unsupported'}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-slate-500">No files selected yet.</p>
          )}

          {deliveryError ? (
            <p role="alert" data-testid="delivery-error" className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {deliveryError}
            </p>
          ) : null}
        </div>
      </Modal>

      <Modal
        isOpen={revisionOrder !== null}
        onClose={() => {
          setRevisionOrder(null);
          setRevisionError(undefined);
        }}
        title={revisionOrder ? `Request a revision on ${revisionOrder.orderNumber}` : 'Request a revision'}
        description={`${revisionOrder?.revisionCountRemaining ?? 0} revision(s) remaining on this order.`}
        testId="revision-modal"
        footer={
          <>
            <Button
              variant="ghost"
              testId="revision-cancel"
              onClick={() => {
                setRevisionOrder(null);
                setRevisionError(undefined);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" testId="revision-submit" onClick={handleRevision}>
              Request revision
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label htmlFor="revision-note" className="block text-sm font-medium text-slate-300">
            What needs to change?
          </label>
          <textarea
            id="revision-note"
            data-testid="revision-note-input"
            value={revisionNote}
            onChange={(event) => setRevisionNote(event.target.value)}
            rows={4}
            placeholder="Tighten the cache headers on the /orders endpoint and re-run the load test."
            className={cn(
              'w-full rounded-xl border bg-slate-900/70 px-3.5 py-3 text-sm text-slate-100 placeholder:text-slate-500',
              revisionError ? 'border-rose-500/70' : 'border-slate-700'
            )}
          />
          {revisionError ? (
            <p role="alert" data-testid="revision-error" className="text-xs text-rose-300">
              {revisionError}
            </p>
          ) : null}
        </div>
      </Modal>
    </section>
  );
}

/** Whole days between the order start and its delivery deadline. */
function deliveryWindowDays(order: OrderItem): number {
  const window = Date.parse(order.dueDate) - Date.parse(order.startDate);
  if (!Number.isFinite(window) || window <= 0) {
    return 1;
  }
  return Math.max(1, Math.round(window / 86_400_000));
}

function OrderDetailPanel({
  order,
  onClose,
  onRequestRevision,
}: {
  order: OrderItem | null;
  onClose: () => void;
  onRequestRevision: (order: OrderItem) => void;
}): React.JSX.Element | null {
  if (!order) {
    return null;
  }

  return (
    <div
      data-testid="order-detail-panel"
      className="mt-4 rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="tabular text-sm font-semibold text-white">{order.orderNumber}</h3>
            <Badge tone="neutral" size="sm">
              {ORDER_STATUS_LABELS[order.status]}
            </Badge>
            <CountdownClock dueDateIsoString={order.dueDate} status={order.status} size="sm" />
          </div>
          <p className="mt-1 text-sm text-slate-300">{order.gigTitle}</p>
        </div>
        <Button variant="ghost" size="sm" testId="order-detail-close" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Timeline</h4>
          <OrderTimelineTracker status={order.status} milestones={order.milestones} />
        </div>

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Requirements</h4>
          {order.requirements.length === 0 ? (
            <p className="text-xs text-slate-500">The buyer has not raised any requirements yet.</p>
          ) : (
            <ul className="space-y-2">
              {order.requirements.map((requirement) => (
                <li key={requirement.id} className="rounded-lg border border-slate-700/70 bg-slate-900/60 px-3 py-2">
                  <p className="text-xs font-medium text-slate-200">{requirement.question}</p>
                  <p className={cn('mt-1 text-xs', requirement.isAnswered ? 'text-slate-400' : 'text-amber-300')}>
                    {requirement.isAnswered ? requirement.answerText : 'Awaiting your answer'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4">
        <Badge tone="info" size="md">
          {formatDeliveryDays(deliveryWindowDays(order))} turnaround
        </Badge>
        <span className="text-xs text-slate-500">Updated {formatRelativeTime(order.updatedAt)}</span>
        {order.status === 'delivered' && order.revisionCountRemaining > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            testId="order-detail-request-revision"
            iconLeft={<RefreshCcw aria-hidden="true" className="size-4" />}
            onClick={() => onRequestRevision(order)}
          >
            Request revision
          </Button>
        ) : null}
      </div>
    </div>
  );
}
