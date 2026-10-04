import { useCallback, useEffect, useState } from 'react';

/**
 * Reactive, schema-aware localStorage state.
 *
 * Synchronises in three directions:
 *  1. same-tab writes update React state immediately,
 *  2. same-tab writes broadcast a `CustomEvent` so sibling hook instances
 *     mounted on the same key converge,
 *  3. cross-tab writes arrive through the native `storage` event.
 */

export function localStorageSyncEventName(key: string): string {
  return `local-storage-sync:${key}`;
}

export function useLocalStorageSync<T>(
  key: string,
  initialValue: T
): [T, (valOrFn: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      if (typeof window === 'undefined') {
        return;
      }
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
          window.dispatchEvent(
            new CustomEvent(localStorageSyncEventName(key), { detail: nextValue })
          );
        } catch (err) {
          console.error(`Storage set error for key: ${key}`, err);
        }
        return nextValue;
      });
    },
    [key]
  );

  useEffect(() => {
    const handleCustomSync = (event: Event) => {
      setStoredValue((event as CustomEvent<T>).detail);
    };

    const handleWindowStorage = (event: StorageEvent) => {
      if (event.key !== key) {
        return;
      }
      try {
        const item = window.localStorage.getItem(key);
        setStoredValue(item ? (JSON.parse(item) as T) : initialValue);
      } catch {
        // Preserve existing state when the payload cannot be parsed.
      }
    };

    const eventName = localStorageSyncEventName(key);
    window.addEventListener(eventName, handleCustomSync);
    window.addEventListener('storage', handleWindowStorage);
    return () => {
      window.removeEventListener(eventName, handleCustomSync);
      window.removeEventListener('storage', handleWindowStorage);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
}