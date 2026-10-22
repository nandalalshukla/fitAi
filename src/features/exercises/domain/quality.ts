import type { RepThresholds, Severity } from './types';

/** Points deducted per (distinct) violated rule during a rep. */
export const SEVERITY_PENALTY: Record<Severity, number> = { info: 3, warning: 10, critical: 25 };
/** Max points lost for incomplete range of motion. */
export const ROM_WEIGHT = 40;
export const TEMPO_PENALTY = 10;

/**
 * Range-of-motion fraction 0..1: how far the rep travelled from `start` toward
 * `target` (reaching or passing the target = 1).
 */
export function rangeOfMotion(extreme: number, th: RepThresholds): number {
  'worklet';
  const span = th.target - th.start;
  if (span === 0 || Number.isNaN(extreme)) return 0;
  return Math.max(0, Math.min(1, (extreme - th.start) / span));
}

/** Rep quality 0..100 from range of motion, form violations and tempo. */
export function repQuality(
  extreme: number,
  th: RepThresholds,
  severities: readonly Severity[],
  tooFast: boolean,
): number {
  'worklet';
  let q = 100 - ROM_WEIGHT * (1 - rangeOfMotion(extreme, th));
  for (const s of severities) q -= SEVERITY_PENALTY[s];
  if (tooFast) q -= TEMPO_PENALTY;
  return Math.round(Math.max(0, Math.min(100, q)));
}
