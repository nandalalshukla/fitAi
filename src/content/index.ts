import { compilePlan, type Plan } from './compile';
import { coreCardioMobilityExercises } from './exercises/coreCardioMobility';
import { lowerExercises } from './exercises/lower';
import { manualExercises } from './exercises/manual';
import { trackedExercises } from './exercises/tracked';
import { upperExercises } from './exercises/upper';
import { planSources } from './plans';
import type { ExerciseInfo } from './schema';

/**
 * Content catalog: exercise library + plans compiled to day-by-day schedules.
 * Everything is static, offline and validated by `src/content/__tests__`.
 */
export const exerciseCatalog: readonly ExerciseInfo[] = [
  ...trackedExercises,
  ...upperExercises,
  ...lowerExercises,
  ...manualExercises,
  ...coreCardioMobilityExercises,
];

const byId = new Map(exerciseCatalog.map((e) => [e.id, e]));

export const getExerciseInfo = (id: string): ExerciseInfo | undefined => byId.get(id);

export const plans: readonly Plan[] = planSources.map((p) => compilePlan(p, getExerciseInfo));

const planById = new Map(plans.map((p) => [p.id, p]));

export const getPlan = (id: string): Plan | undefined => planById.get(id);

export type { Plan, PlanDay, CompiledSession } from './compile';
export { estimateSessionSeconds, setWorkSeconds } from './compile';
export * from './schema';
