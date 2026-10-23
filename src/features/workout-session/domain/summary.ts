import type { WorkoutSet } from '@/data/models';

export interface NewBest {
  exerciseId: string;
  kind: 'reps' | 'hold';
  value: number;
  previous: number;
}

export interface SessionSummary {
  setsDone: number;
  setsSkipped: number;
  totalReps: number;
  heldSeconds: number;
  avgQuality: number | null;
  exercises: {
    exerciseId: string;
    sets: number;
    reps: number;
    heldSeconds: number;
    avgQuality: number | null;
  }[];
  newBests: NewBest[];
}

const isSkipped = (s: WorkoutSet) => s.formFlags.includes('skipped');

/**
 * Totals for one session plus personal bests beaten compared with all earlier
 * sets. A first-ever set of an exercise is not called a "personal best".
 */
export function summarizeSession(
  sets: readonly WorkoutSet[],
  earlierSets: readonly WorkoutSet[],
): SessionSummary {
  const done = sets.filter((s) => !isSkipped(s) && !s.deletedAt);
  const byExercise = new Map<string, WorkoutSet[]>();
  for (const s of done) byExercise.set(s.exerciseId, [...(byExercise.get(s.exerciseId) ?? []), s]);

  const exercises = [...byExercise.entries()].map(([exerciseId, xs]) => {
    const q = xs.filter((x) => x.avgQuality !== null).map((x) => x.avgQuality!);
    return {
      exerciseId,
      sets: xs.length,
      reps: xs.reduce((a, x) => a + x.reps, 0),
      heldSeconds: xs.reduce((a, x) => a + (x.heldSeconds ?? 0), 0),
      avgQuality: q.length ? Math.round(q.reduce((a, b) => a + b, 0) / q.length) : null,
    };
  });

  const newBests: NewBest[] = [];
  for (const [exerciseId, xs] of byExercise) {
    const before = earlierSets.filter(
      (s) => s.exerciseId === exerciseId && !s.deletedAt && !isSkipped(s),
    );
    if (before.length === 0) continue;
    const prevReps = Math.max(0, ...before.map((s) => s.reps));
    const prevHold = Math.max(0, ...before.map((s) => s.heldSeconds ?? 0));
    const reps = Math.max(0, ...xs.map((s) => s.reps));
    const hold = Math.max(0, ...xs.map((s) => s.heldSeconds ?? 0));
    if (reps > prevReps && prevReps > 0)
      newBests.push({ exerciseId, kind: 'reps', value: reps, previous: prevReps });
    if (hold > prevHold && prevHold > 0)
      newBests.push({ exerciseId, kind: 'hold', value: hold, previous: prevHold });
  }

  const q = done.filter((x) => x.avgQuality !== null).map((x) => x.avgQuality!);
  return {
    setsDone: done.length,
    setsSkipped: sets.length - done.length,
    totalReps: done.reduce((a, x) => a + x.reps, 0),
    heldSeconds: done.reduce((a, x) => a + (x.heldSeconds ?? 0), 0),
    avgQuality: q.length ? Math.round(q.reduce((a, b) => a + b, 0) / q.length) : null,
    exercises,
    newBests,
  };
}

/** Plain-text share message (no personal data beyond the workout numbers). */
export function shareText(
  s: SessionSummary,
  minutes: number,
  streak: number,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  return [
    t('summary.shareTitle'),
    t('summary.shareLine', { reps: s.totalReps, sets: s.setsDone, minutes }),
    s.avgQuality !== null ? t('summary.shareForm', { score: s.avgQuality }) : null,
    streak > 1 ? t('summary.shareStreak', { count: streak }) : null,
    t('summary.shareFooter'),
  ]
    .filter(Boolean)
    .join('\n');
}
