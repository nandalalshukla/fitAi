import type { BlockKind, CompiledSession, ExerciseInfo } from '@/content';
import type { ExerciseId } from '@/features/exercises/domain/types';

/** One set to perform. `index` is the session-wide set index (stored as `set_index`). */
export interface SessionStep {
  index: number;
  /** Catalog exercise id; null in free mode until the classifier recognises the exercise. */
  exerciseId: string | null;
  tracked: ExerciseId | null;
  mode: 'reps' | 'time';
  blockKind: BlockKind;
  blockTitle: string;
  /** 1-based set number within this exercise and its total sets. */
  setNumber: number;
  setCount: number;
  targetReps: number | null;
  targetSeconds: number | null;
  perSide: boolean;
  restAfterS: number;
}

export type ExerciseLookup = (id: string) => ExerciseInfo | undefined;

/** Flattens a compiled plan session into the ordered list of sets. */
export function buildSteps(session: CompiledSession, lookup: ExerciseLookup): SessionStep[] {
  const steps: SessionStep[] = [];
  for (const block of session.blocks) {
    for (const item of block.items) {
      const info = lookup(item.exerciseId);
      for (let s = 1; s <= item.sets; s++) {
        steps.push({
          index: steps.length,
          exerciseId: item.exerciseId,
          tracked: info?.tracked ?? null,
          mode: item.seconds !== undefined ? 'time' : 'reps',
          blockKind: block.kind,
          blockTitle: block.title,
          setNumber: s,
          setCount: item.sets,
          targetReps: item.reps ?? null,
          targetSeconds: item.seconds ?? null,
          perSide: info?.perSide ?? false,
          restAfterS: item.restS,
        });
      }
    }
  }
  // No rest after the very last set.
  const last = steps.at(-1);
  if (last) last.restAfterS = 0;
  return steps;
}

/** Free mode: an open-ended set; the classifier picks the exercise, the user ends the set. */
export function freeStep(index: number): SessionStep {
  return {
    index,
    exerciseId: null,
    tracked: null,
    mode: 'reps',
    blockKind: 'main',
    blockTitle: 'Free',
    setNumber: index + 1,
    setCount: 0,
    targetReps: null,
    targetSeconds: null,
    perSide: false,
    restAfterS: 60,
  };
}
