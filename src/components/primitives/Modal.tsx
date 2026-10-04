import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_STYLES: Record<ModalSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface ModalProps {
  isOpen: boolean;
  /** Invoked for Escape, the close button and (optionally) backdrop clicks. */
  onClose: () => void;
  /** Accessible dialog title, also rendered in the header. */
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  closeOnBackdropClick?: boolean;
  hideCloseButton?: boolean;
  /** Disables body scroll locking (e.g. nested non-blocking menus). */
  disableScrollLock?: boolean;
  className?: string;
  testId?: string;
}

/**
 * Accessible dialog.
 *
 * - mobile: bottom sheet anchored to the bottom safe area
 * - >= 640px: centred dialog
 * - focus is trapped while open and restored to the trigger on close
 * - Escape and backdrop dismissal, body scroll lock, `aria-modal` semantics
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdropClick = true,
  hideCloseButton = false,
  disableScrollLock = false,
  className,
  testId,
}: ModalProps): React.JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2, 9)}`);
  const descriptionId = useRef(`modal-description-${Math.random().toString(36).slice(2, 9)}`);

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!dialogRef.current) {
      return [];
    }
    return Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (element) => element.offsetParent !== null || element.getClientRects().length > 0
    );
  }, []);

  // Focus management, scroll lock and cleanup.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusable = getFocusableElements();
    const focusTarget = focusable[0] ?? dialogRef.current;
    window.setTimeout(() => focusTarget?.focus(), 0);

    let previousOverflow: string | null = null;
    if (!disableScrollLock) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }

    return () => {
      if (!disableScrollLock) {
        document.body.style.overflow = previousOverflow ?? '';
      }
      previouslyFocused.current?.focus();
    };
  }, [isOpen, disableScrollLock, getFocusableElements]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key !== 'Tab') {
      return;
    }

    const focusable = getFocusableElements();
    if (focusable.length === 0) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = document.activeElement;

    if (event.shiftKey && (activeElement === first || activeElement === dialogRef.current)) {
      event.preventDefault();
      last.focus();
      return;
    }

    if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      data-testid={testId ? `${testId}-overlay` : 'modal-overlay'}
    >
      <div
        aria-hidden="true"
        data-testid="modal-backdrop"
        onClick={closeOnBackdropClick ? onClose : undefined}
        className="absolute inset-0 animate-fade-in bg-slate-950/80 backdrop-blur-sm"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId.current}
        aria-describedby={description ? descriptionId.current : undefined}
        tabIndex={-1}
        data-testid={testId}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/60',
          'animate-sheet-enter rounded-t-2xl sm:animate-fade-in sm:rounded-2xl',
          'pb-[env(safe-area-inset-bottom)] sm:pb-0',
          SIZE_STYLES[size],
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId.current} className="truncate text-base font-semibold text-white">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId.current} className="mt-1 text-sm text-slate-400">
                {description}
              </p>
            ) : null}
          </div>
          {!hideCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              aria-label={`Close ${title}`}
              data-testid="modal-close"
              className="-mr-1 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>

        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-800 px-5 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
}