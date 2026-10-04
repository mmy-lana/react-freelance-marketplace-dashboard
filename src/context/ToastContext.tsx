import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '../utils/cn';
import { generateSafeId } from '../utils/id';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
  /** Auto dismissal delay; `0` keeps the toast until dismissed manually. */
  durationMs: number;
}

export interface ToastContextValue {
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, 'id' | 'durationMs'> & { durationMs?: number }) => string;
  dismissToast: (id: string) => void;
  dismissAllToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'border-emerald-500/50 bg-emerald-950/90 text-emerald-100',
  error: 'border-rose-500/50 bg-rose-950/90 text-rose-100',
  warning: 'border-amber-400/50 bg-amber-950/90 text-amber-100',
  info: 'border-sky-400/50 bg-slate-900/95 text-slate-100',
};

const TONE_ICONS: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 aria-hidden="true" className="size-5 text-emerald-400" />,
  error: <XCircle aria-hidden="true" className="size-5 text-rose-400" />,
  warning: <AlertTriangle aria-hidden="true" className="size-5 text-amber-400" />,
  info: <Info aria-hidden="true" className="size-5 text-sky-400" />,
};

const DEFAULT_DURATION_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, number>>({});

  const dismissToast = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
    const timer = timers.current[id];
    if (timer !== undefined) {
      window.clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  const dismissAllToasts = useCallback(() => {
    setToasts([]);
    Object.values(timers.current).forEach((timer) => window.clearTimeout(timer));
    timers.current = {};
  }, []);

  const pushToast = useCallback<ToastContextValue['pushToast']>(
    ({ tone, title, description, durationMs }) => {
      const id = generateSafeId('toast');
      const resolvedDuration = durationMs ?? DEFAULT_DURATION_MS;

      setToasts((previous) => {
        // Cap the stack so a burst of mutations cannot cover the viewport.
        const next = [...previous, { id, tone, title, description, durationMs: resolvedDuration }];
        return next.slice(-4);
      });

      if (resolvedDuration > 0) {
        timers.current[id] = window.setTimeout(() => {
          dismissToast(id);
        }, resolvedDuration);
      }

      return id;
    },
    [dismissToast]
  );

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      Object.values(activeTimers).forEach((timer) => window.clearTimeout(timer));
      timers.current = {};
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, pushToast, dismissToast, dismissAllToasts }),
    [toasts, pushToast, dismissToast, dismissAllToasts]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className={cn(
          'pointer-events-none fixed inset-x-0 z-[80] flex flex-col items-center gap-2 px-4',
          'bottom-[calc(var(--nav-bottom-height)+12px)] md:bottom-6 md:items-end md:px-6'
        )}
      >
        <div aria-live="polite" aria-atomic="false" className="flex w-full flex-col items-center gap-2 md:max-w-sm md:items-end">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              data-testid="toast"
              data-tone={toast.tone}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              className={cn(
                'pointer-events-auto flex w-full animate-toast-in items-start gap-3 rounded-xl border px-4 py-3 shadow-xl shadow-slate-950/50 backdrop-blur',
                TONE_STYLES[toast.tone]
              )}
            >
              <span className="mt-0.5 shrink-0">{TONE_ICONS[toast.tone]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description ? <p className="mt-0.5 text-xs opacity-80">{toast.description}</p> : null}
              </div>
              <button
                type="button"
                aria-label={`Dismiss notification: ${toast.title}`}
                onClick={() => dismissToast(toast.id)}
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg opacity-70 transition-opacity hover:opacity-100"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

/** Access the toast queue. Throws when used outside `ToastProvider`. */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}