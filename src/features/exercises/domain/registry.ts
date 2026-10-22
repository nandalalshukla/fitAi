import {
  crunch,
  gluteBridge,
  highKnees,
  jumpingJack,
  legRaise,
  lunge,
  mountainClimber,
  plank,
  pushUp,
  sitUp,
  squat,
} from './definitions';
import type { ExerciseDefinition, ExerciseId, ThresholdSet } from './types';

/**
 * Exercise registry. Adding an exercise = one file in ./definitions + one line
 * here (see docs/ADDING_AN_EXERCISE.md).
 */
const registry = new Map<ExerciseId, ExerciseDefinition<ThresholdSet>>();

export function registerExercise<T extends ThresholdSet>(def: ExerciseDefinition<T>): void {
  if (registry.has(def.id)) throw new Error(`Exercise "${def.id}" is already registered`);
  registry.set(def.id, def as unknown as ExerciseDefinition<ThresholdSet>);
}

export function getExercise(id: ExerciseId): ExerciseDefinition<ThresholdSet> {
  const def = registry.get(id);
  if (!def) throw new Error(`Unknown exercise "${id}"`);
  return def;
}

export function hasExercise(id: string): id is ExerciseId {
  return registry.has(id as ExerciseId);
}

export function allExercises(): ExerciseDefinition<ThresholdSet>[] {
  return [...registry.values()];
}

[
  squat,
  pushUp,
  jumpingJack,
  plank,
  sitUp,
  crunch,
  lunge,
  highKnees,
  mountainClimber,
  gluteBridge,
  legRaise,
].forEach((d) => registerExercise(d as unknown as ExerciseDefinition<ThresholdSet>));
