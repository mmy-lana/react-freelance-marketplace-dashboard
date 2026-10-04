import { useEffect, useState } from 'react';
import { computeRemainingTime, type TimeRemaining } from '../utils/date';

/**
 * Second-by-second countdown to an ISO deadline.
 *
 * The interval is torn down whenever the target changes or the component
 * unmounts, and the value is recomputed from `Date.now()` on every tick so
 * background-tab throttling cannot drift the display.
 */
export function useOrderCountdown(dueDateIsoString: string, options?: { paused?: boolean }): TimeRemaining {
  const paused = options?.paused ?? false;
  const [remaining, setRemaining] = useState<TimeRemaining>(() => computeRemainingTime(dueDateIsoString, Date.now()));

  useEffect(() => {
    setRemaining(computeRemainingTime(dueDateIsoString, Date.now()));

    if (paused) {
      return;
    }

    const timer = window.setInterval(() => {
      setRemaining(computeRemainingTime(dueDateIsoString, Date.now()));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [dueDateIsoString, paused]);

  return remaining;
}