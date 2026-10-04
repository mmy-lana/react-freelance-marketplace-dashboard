import { useState } from 'react';
import type { SellerLevel } from '../../types/marketplace';
import { cn } from '../../utils/cn';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type PresenceStatus = 'online' | 'away' | 'offline';

const SIZE_STYLES: Record<AvatarSize, string> = {
  xs: 'size-7 text-[10px]',
  sm: 'size-9 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-14 text-base',
  xl: 'size-20 text-xl',
};

const MONOGRAM_TONES: Record<AvatarSize, string> = {
  xs: 'from-slate-600 to-slate-800',
  sm: 'from-emerald-600/80 to-slate-800',
  md: 'from-emerald-500/70 to-slate-800',
  lg: 'from-emerald-500/60 to-slate-800',
  xl: 'from-emerald-400/50 to-slate-800',
};

const LEVEL_RING_STYLES: Record<SellerLevel, string> = {
  new_seller: 'ring-slate-600',
  level_one: 'ring-sky-400/70',
  level_two: 'ring-emerald-400/80',
  top_rated: 'ring-amber-400/80',
};

const PRESENCE_STYLES: Record<PresenceStatus, string> = {
  online: 'bg-emerald-400',
  away: 'bg-amber-400',
  offline: 'bg-slate-500',
};

const PRESENCE_LABELS: Record<PresenceStatus, string> = {
  online: 'Online',
  away: 'Away',
  offline: 'Offline',
};

/** Derives up to two uppercase initials from a display name or username. */
export function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/[\s._-]+/)
    .filter((part) => part.length > 0);

  if (parts.length === 0) {
    return '?';
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export interface AvatarProps {
  /** Image source; the monogram fallback renders when it is empty or fails to load. */
  src?: string;
  /** Used for the monogram and the accessible label. */
  name: string;
  size?: AvatarSize;
  /** Adds a tier coloured ring derived from the seller level. */
  level?: SellerLevel;
  /** Optional presence dot anchored bottom-right. */
  presence?: PresenceStatus;
  className?: string;
  testId?: string;
}

/**
 * Rounded avatar with a deterministic monogram fallback.
 * A broken image URL degrades to the initials instead of a broken icon.
 */
export function Avatar({
  src,
  name,
  size = 'md',
  level,
  presence,
  className,
  testId,
}: AvatarProps): React.JSX.Element {
  const [hasImageError, setHasImageError] = useState(false);
  const showImage = typeof src === 'string' && src.length > 0 && !hasImageError;

  return (
    <span
      data-testid={testId}
      className={cn('relative inline-flex shrink-0', className)}
      title={name}
    >
      <span
        role="img"
        aria-label={`${name} avatar`}
        className={cn(
          'inline-flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br font-semibold text-white ring-2',
          MONOGRAM_TONES[size],
          level ? LEVEL_RING_STYLES[level] : 'ring-transparent',
          SIZE_STYLES[size]
        )}
      >
        {showImage ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
            onError={() => setHasImageError(true)}
          />
        ) : (
          <span aria-hidden="true" data-testid="avatar-monogram">
            {getInitials(name)}
          </span>
        )}
      </span>
      {presence ? (
        <span
          aria-label={PRESENCE_LABELS[presence]}
          role="img"
          className={cn(
            'absolute bottom-0 right-0 size-3 rounded-full ring-2 ring-slate-900',
            PRESENCE_STYLES[presence]
          )}
        />
      ) : null}
    </span>
  );
}