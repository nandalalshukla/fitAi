import { useEffect, useState } from 'react';

/** Re-renders every `intervalMs` while `active`, returning the current time (ms). */
export function useTicker(active: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    // Refresh right away (async) so a re-activated ticker doesn't report a stale time.
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [active, intervalMs]);
  return now;
}
