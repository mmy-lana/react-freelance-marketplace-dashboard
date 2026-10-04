import { Loader2 } from 'lucide-react';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, MouseEvent, ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald-500 text-slate-950 hover:bg-emerald-400 active:bg-emerald-600 disabled:bg-emerald-500/40 disabled:text-slate-950/60 shadow-sm shadow-emerald-950/40',
  secondary:
    'bg-slate-800 text-slate-100 hover:bg-slate-700 active:bg-slate-600 border border-slate-700 disabled:bg-slate-800/50 disabled:text-slate-500',
  outline:
    'border border-slate-600 bg-transparent text-slate-200 hover:border-emerald-400 hover:text-emerald-300 active:bg-slate-800 disabled:border-slate-700 disabled:text-slate-600',
  danger:
    'bg-rose-600 text-white hover:bg-rose-500 active:bg-rose-700 disabled:bg-rose-600/40 disabled:text-white/60 shadow-sm shadow-rose-950/40',
  ghost: 'bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100 active:bg-slate-700 disabled:text-slate-600',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'min-h-[44px] px-3 text-sm gap-1.5 rounded-lg',
  md: 'min-h-[44px] px-4 text-sm gap-2 rounded-xl',
  lg: 'min-h-[48px] px-5 text-base gap-2.5 rounded-xl',
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: 'size-4',
  md: 'size-4',
  lg: 'size-5',
};

interface ButtonBaseProps {
  /** Visual treatment. */
  variant?: ButtonVariant;
  /** Touch target sizing; every size stays at or above the 44px minimum. */
  size?: ButtonSize;
  /** Shows a spinner, blocks interaction and announces a busy state. */
  isLoading?: boolean;
  /** Screen reader announcement while `isLoading` is true. */
  loadingLabel?: string;
  /** Icon rendered before the label. */
  iconLeft?: ReactNode;
  /** Icon rendered after the label. */
  iconRight?: ReactNode;
  /** Stretch to the container width (mobile primary actions). */
  fullWidth?: boolean;
  /** Square aspect ratio for icon-only buttons; the label becomes screen-reader only. */
  iconOnly?: boolean;
  className?: string;
  children?: ReactNode;
  /** Explicit `data-testid` for the rendered element. */
  testId?: string;
}

export interface ButtonAsButtonProps
  extends ButtonBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps | 'children'> {
  as?: 'button';
  href?: undefined;
}

export interface ButtonAsAnchorProps
  extends ButtonBaseProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps | 'children'> {
  as?: 'a';
  href: string;
}

export type ButtonProps = ButtonAsButtonProps | ButtonAsAnchorProps;

function buttonClasses(props: Required<Pick<ButtonBaseProps, 'variant' | 'size'>> & ButtonBaseProps): string {
  const { variant, size, isLoading = false, fullWidth = false, iconOnly = false, className } = props;
  return cn(
    'inline-flex select-none items-center justify-center font-semibold transition-colors duration-150',
    'disabled:cursor-not-allowed',
    isLoading && 'cursor-progress',
    VARIANT_STYLES[variant],
    SIZE_STYLES[size],
    iconOnly && 'aspect-square px-0',
    fullWidth && 'w-full',
    className
  );
}

/**
 * Polymorphic action primitive.
 *
 * Renders a `<button>` by default and promotes to an `<a>` as soon as `href` is
 * supplied, so links keep native semantics (middle-click, copy address) while
 * sharing one visual contract.
 */
export function Button(props: ButtonProps): React.JSX.Element {
  const {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    loadingLabel = 'Working…',
    iconLeft,
    iconRight,
    fullWidth = false,
    iconOnly = false,
    className,
    children,
    testId,
  } = props;

  const rendersAsAnchor = typeof props.href === 'string';
  const classes = buttonClasses({ variant, size, isLoading, fullWidth, iconOnly, className });
  const iconOnlyLabel =
    typeof children === 'string'
      ? children
      : typeof props['aria-label'] === 'string'
        ? (props['aria-label'] as string)
        : 'Action';

  const content = (
    <>
      {isLoading ? <Loader2 aria-hidden="true" className={cn('animate-spin', ICON_SIZES[size])} /> : iconLeft}
      {iconOnly ? (
        <span className="sr-only">{iconOnlyLabel}</span>
      ) : (
        <>
          {children}
          {isLoading ? <span className="sr-only">{loadingLabel}</span> : iconRight}
        </>
      )}
    </>
  );

  if (rendersAsAnchor) {
    const anchorProps = props as ButtonAsAnchorProps;
    const { as: _as, href, variant: _variant, size: _size, isLoading: _isLoading, loadingLabel: _loadingLabel } =
      anchorProps;
    const {
      iconLeft: _iconLeft,
      iconRight: _iconRight,
      fullWidth: _fullWidth,
      iconOnly: _iconOnly,
      testId: _testId,
      className: _className,
      children: _children,
      ...nativeAnchorProps
    } = anchorProps;

    return (
      <a
        {...nativeAnchorProps}
        href={href}
        className={classes}
        aria-busy={isLoading || undefined}
        data-loading={isLoading ? 'true' : undefined}
        data-testid={testId}
        onClick={(event: MouseEvent<HTMLAnchorElement>) => {
          if (isLoading) {
            event.preventDefault();
            return;
          }
          anchorProps.onClick?.(event);
        }}
      >
        {content}
      </a>
    );
  }

  const buttonProps = props as ButtonAsButtonProps;
  const { variant: _variant, size: _size, isLoading: _isLoading, loadingLabel: _loadingLabel } = buttonProps;
  const {
    iconLeft: _iconLeft,
    iconRight: _iconRight,
    fullWidth: _fullWidth,
    iconOnly: _iconOnly,
    testId: _testId,
    className: _className,
    children: _children,
    ...nativeButtonProps
  } = buttonProps;
  const isDisabled = isLoading || nativeButtonProps.disabled === true;

  return (
    <button
      {...nativeButtonProps}
      type={nativeButtonProps.type ?? 'button'}
      className={classes}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      data-loading={isLoading ? 'true' : undefined}
      data-testid={testId}
    >
      {content}
    </button>
  );
}