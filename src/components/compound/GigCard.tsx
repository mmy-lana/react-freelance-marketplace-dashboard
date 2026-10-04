import { ChevronLeft, ChevronRight, Clock3, Heart, Star, Users } from 'lucide-react';
import { useState, type MouseEvent } from 'react';
import { Avatar } from '../primitives/Avatar';
import { GigStatusBadge, SellerLevelBadge } from '../primitives/Badge';
import { formatCentsToUsd } from '../../utils/currency';
import { formatDeliveryDays } from '../../utils/date';
import { cn } from '../../utils/cn';
import type { GigItem } from '../../types/marketplace';

export interface GigCardProps {
  gig: GigItem;
  /** Opens the gig workspace / package matrix. */
  onSelect?: (gig: GigItem) => void;
  /** Toggles the listing between active and paused. */
  onToggleStatus?: (gig: GigItem) => void;
  /** Optional selection state used by the explorer filter rail. */
  isSelected?: boolean;
  onToggleSelect?: (gig: GigItem) => void;
  /** Hides seller identity for buyer-mode browsing. */
  compactSeller?: boolean;
  className?: string;
  testId?: string;
}

/**
 * Creative grid card: 16:10 media showcase with a slider, seller identity row,
 * clamped title, rating, lifecycle badge and pricing footer.
 */
export function GigCard({
  gig,
  onSelect,
  onToggleStatus,
  isSelected = false,
  onToggleSelect,
  compactSeller = false,
  className,
  testId,
}: GigCardProps): React.JSX.Element {
  const [imageIndex, setImageIndex] = useState(0);
  const images = gig.images.length > 0 ? gig.images : [gig.thumbnailUrl];
  const currentImage = images[Math.min(imageIndex, images.length - 1)] ?? gig.thumbnailUrl;
  const isMine = gig.sellerId === gig.seller.id;

  const step = (delta: number): void => {
    setImageIndex((previous) => (previous + delta + images.length) % images.length);
  };

  const handleCardClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (onToggleSelect) {
      onToggleSelect(gig);
    } else if (onSelect) {
      onSelect(gig);
    }
    void event;
  };

  const handleToggleStatus = (event: MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    onToggleStatus?.(gig);
  };

  return (
    <article
      data-testid={testId}
      data-gig-id={gig.id}
      data-selected={isSelected ? 'true' : 'false'}
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (onSelect) {
            onSelect(gig);
          }
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${gig.title} by ${gig.seller.displayName}`}
      className={cn(
        'group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border bg-slate-800/50 transition-colors',
        isSelected
          ? 'border-emerald-400/70 ring-1 ring-emerald-400/40'
          : 'border-slate-700/70 hover:border-slate-500/80',
        className
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
        <img
          src={currentImage}
          alt={`${gig.title} preview ${imageIndex + 1} of ${images.length}`}
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

        {images.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Previous preview"
              onClick={(event) => {
                event.stopPropagation();
                step(-1);
              }}
              className="absolute left-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-600/70 bg-slate-950/70 text-slate-200 opacity-90 transition-opacity hover:bg-slate-900 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-90 md:group-focus-within:opacity-90"
            >
              <ChevronLeft aria-hidden="true" className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Next preview"
              onClick={(event) => {
                event.stopPropagation();
                step(1);
              }}
              className="absolute right-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-600/70 bg-slate-950/70 text-slate-200 opacity-90 transition-opacity hover:bg-slate-900 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-90 md:group-focus-within:opacity-90"
            >
              <ChevronRight aria-hidden="true" className="size-5" />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((image, index) => (
                <span
                  key={image.slice(-32) + index}
                  aria-hidden="true"
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    index === imageIndex ? 'w-5 bg-emerald-400' : 'w-1.5 bg-white/50'
                  )}
                />
              ))}
            </div>
          </>
        ) : null}

        <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-600/60 bg-slate-950/70 px-2 py-1 text-[11px] font-medium text-slate-200">
            {gig.subcategory}
          </span>
          <GigStatusBadge status={gig.status} size="md" />
        </div>

        {onToggleSelect ? (
          <button
            type="button"
            aria-label={isSelected ? `Remove ${gig.title} from selection` : `Add ${gig.title} to selection`}
            aria-pressed={isSelected}
            onClick={(event) => {
              event.stopPropagation();
              onToggleSelect(gig);
            }}
            className={cn(
              'absolute right-3 top-3 inline-flex size-11 items-center justify-center rounded-full border border-slate-600/70 bg-slate-950/70 transition-colors',
              isSelected ? 'text-rose-300' : 'text-slate-300 hover:text-rose-300'
            )}
          >
            <Heart aria-hidden="true" className="size-5" fill={isSelected ? 'currentColor' : 'none'} />
          </button>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {!compactSeller ? (
          <div className="flex items-center gap-2.5">
            <Avatar src={gig.seller.avatarUrl} name={gig.seller.displayName} size="sm" level={gig.seller.level} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-200">{gig.seller.displayName}</p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <SellerLevelBadge level={gig.seller.level} />
                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                  <Star aria-hidden="true" className="size-3 fill-amber-400 text-amber-400" />
                  {gig.seller.rating.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white sm:text-base">{gig.title}</h3>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Star aria-hidden="true" className="size-3.5 fill-amber-400 text-amber-400" />
            <span className="font-medium text-slate-200">{gig.rating.toFixed(2)}</span>
            <span className="tabular">({gig.reviewCount.toLocaleString('en-US')})</span>
          </span>
          {isMine ? (
            <span className="inline-flex items-center gap-1">
              <Users aria-hidden="true" className="size-3.5" />
              <span className="tabular">{gig.ordersInQueueCount} in queue</span>
            </span>
          ) : null}
          {gig.status === 'paused' && onToggleStatus ? (
            <button
              type="button"
              onClick={handleToggleStatus}
              className="inline-flex min-h-[44px] items-center rounded-lg px-2 font-semibold text-emerald-300 hover:bg-emerald-500/10"
            >
              Resume listing
            </button>
          ) : null}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-700/60 pt-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Starting at</p>
            <p className="tabular text-base font-bold text-white">{formatCentsToUsd(gig.startingPriceCents)}</p>
          </div>
          <span className="inline-flex min-h-[28px] items-center gap-1 rounded-full border border-slate-600/70 bg-slate-900/70 px-2.5 text-xs text-slate-300">
            <Clock3 aria-hidden="true" className="size-3.5" />
            {formatDeliveryDays(gig.packages.basic.deliveryDays)}
          </span>
        </div>
      </div>
    </article>
  );
}