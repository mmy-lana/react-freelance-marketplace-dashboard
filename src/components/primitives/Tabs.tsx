import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../../utils/cn';

export interface TabItem<TId extends string> {
  id: TId;
  label: string;
  icon?: ReactNode;
  /** Optional counter rendered as a pill next to the label. */
  badgeCount?: number;
  disabled?: boolean;
}

export interface TabsProps<TId extends string> {
  items: readonly TabItem<TId>[];
  activeId: TId;
  onChange: (id: TId) => void;
  /** Accessible name for the tab list. */
  ariaLabel: string;
  size?: 'sm' | 'md';
  /** Stretches tabs evenly across the container. */
  stretch?: boolean;
  className?: string;
  testId?: string;
}

interface IndicatorState {
  left: number;
  width: number;
}

/**
 * Sliding-indicator tabs.
 *
 * Implements the WAI-ARIA tabs pattern with roving tabindex, arrow/Home/End key
 * navigation, and an indicator that animates between tabs on resize as well as
 * on selection.
 */
export function Tabs<TId extends string>({
  items,
  activeId,
  onChange,
  ariaLabel,
  size = 'md',
  stretch = false,
  className,
  testId,
}: TabsProps<TId>): React.JSX.Element {
  const listRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<IndicatorState>({ left: 0, width: 0 });

  const measureIndicator = useCallback(() => {
    const activeTab = tabRefs.current[activeId];
    if (!activeTab) {
      setIndicator({ left: 0, width: 0 });
      return;
    }
    setIndicator({ left: activeTab.offsetLeft, width: activeTab.offsetWidth });
  }, [activeId]);

  useLayoutEffect(() => {
    measureIndicator();
  }, [measureIndicator, items.length]);

  useEffect(() => {
    window.addEventListener('resize', measureIndicator);
    return () => window.removeEventListener('resize', measureIndicator);
  }, [measureIndicator]);

  const enabledIds = items.filter((item) => !item.disabled).map((item) => item.id);

  const focusTabById = (id: TId): void => {
    tabRefs.current[id]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (enabledIds.length === 0) {
      return;
    }
    const currentIndex = enabledIds.indexOf(activeId);

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % enabledIds.length;
        const nextId = enabledIds[nextIndex];
        onChange(nextId);
        focusTabById(nextId);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        event.preventDefault();
        const previousIndex = (currentIndex - 1 + enabledIds.length) % enabledIds.length;
        const previousId = enabledIds[previousIndex];
        onChange(previousId);
        focusTabById(previousId);
        break;
      }
      case 'Home': {
        event.preventDefault();
        const firstId = enabledIds[0];
        onChange(firstId);
        focusTabById(firstId);
        break;
      }
      case 'End': {
        event.preventDefault();
        const lastId = enabledIds[enabledIds.length - 1];
        onChange(lastId);
        focusTabById(lastId);
        break;
      }
      default:
        break;
    }
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      data-testid={testId}
      onKeyDown={handleKeyDown}
      className={cn(
        'no-scrollbar relative flex overflow-x-auto gap-1 rounded-xl border border-slate-700/70 bg-slate-900/60 p-1',
        stretch && 'w-full',
        className
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1 top-1 rounded-lg bg-slate-800 transition-all duration-200 ease-out"
        style={{
          left: `${indicator.left}px`,
          width: `${indicator.width}px`,
        }}
      />
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            ref={(node) => {
              tabRefs.current[item.id] = node;
            }}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${item.id}`}
            tabIndex={isActive ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={cn(
              'relative z-10 inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-3.5 font-medium transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
              size === 'sm' ? 'text-sm' : 'text-sm md:text-base',
              stretch && 'flex-1',
              isActive ? 'text-emerald-300' : 'text-slate-400 hover:text-slate-200'
            )}
          >
            {item.icon ? (
              <span aria-hidden="true" className="inline-flex items-center">
                {item.icon}
              </span>
            ) : null}
            {item.label}
            {typeof item.badgeCount === 'number' && item.badgeCount > 0 ? (
              <span
                className={cn(
                  'inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
                  isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700/70 text-slate-300'
                )}
              >
                {item.badgeCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}