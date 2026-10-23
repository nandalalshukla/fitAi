import type { PlanItem } from '@/content';
import type { LooseT as T } from '@/i18n';

import type { SessionStep } from './domain/steps';

/** "12 reps" / "45 s" (+ "each side"), for one set. */
export function formatTarget(
  target: { targetReps: number | null; targetSeconds: number | null; perSide: boolean },
  t: T,
): string {
  const main =
    target.targetSeconds !== null
      ? t('workout.seconds', { count: target.targetSeconds })
      : target.targetReps !== null
        ? t('workout.reps', { count: target.targetReps })
        : '';
  return target.perSide && main ? `${main} ${t('workout.perSide')}` : main;
}

/** "3 × 12" / "2 × 45 s" for a plan item. */
export function formatPrescription(item: PlanItem, perSide: boolean, t: T): string {
  const each =
    item.seconds !== undefined ? t('workout.seconds', { count: item.seconds }) : String(item.reps);
  return `${item.sets} × ${each}${perSide ? ` ${t('workout.perSide')}` : ''}`;
}

export const stepTarget = (s: SessionStep, t: T) => formatTarget(s, t);

/** m:ss */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
