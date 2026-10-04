import { useEffect, useState } from 'react';

/**
 * Value throttling for high frequency input streams.
 * Every pending timer is cancelled so a fast typist only commits the last value.
 */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => window.clearTimeout(handler);
  }, [value, delayMs]);

  return debouncedValue;
}