import { freeStep, type SessionStep } from './steps';

/**
 * Workout player state machine (pure; time is passed in so it is fully testable).
 *
 *   ready ──begin──▶ countdown ──countdownDone──▶ active ──completeSet──▶ rest ──(timer | skipRest)──▶ countdown …
 *                                                        └─ last set ─▶ done
 * Pause freezes timers (rest end and set start are shifted on resume).
 */
export type PlayerPhase = 'ready' | 'countdown' | 'active' | 'rest' | 'done';

export interface SetResult {
  stepIndex: number;
  exerciseId: string;
  reps: number;
  heldSeconds: number | null;
  avgQuality: number | null;
  formFlags: string[];
  manualAdjustment: number;
  cameraTracked: boolean;
  skipped: boolean;
  startedAt: number;
  endedAt: number;
}

export interface PlayerState {
  steps: SessionStep[];
  index: number;
  phase: PlayerPhase;
  free: boolean;
  paused: boolean;
  pausedAt: number | null;
  /** When the current phase (countdown/active/rest) started. */
  phaseStartedAt: number;
  restEndsAt: number | null;
  results: SetResult[];
}

/** Seconds between exercises when an exercise is skipped (get into position). */
export const SKIP_TRANSITION_S = 15;
export const MAX_REST_EXTENSION_S = 300;

export type PlayerAction =
  | { type: 'begin'; now: number }
  | { type: 'countdownDone'; now: number }
  | {
      type: 'completeSet';
      now: number;
      result: Omit<SetResult, 'stepIndex' | 'startedAt' | 'endedAt' | 'skipped' | 'exerciseId'> & {
        exerciseId?: string;
      };
    }
  | { type: 'tick'; now: number }
  | { type: 'skipRest'; now: number }
  | { type: 'extendRest'; now: number; seconds: number }
  | { type: 'skipExercise'; now: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'finish'; now: number };

export function createPlayer(steps: SessionStep[], now: number, free = false): PlayerState {
  return {
    steps: free && steps.length === 0 ? [freeStep(0)] : steps,
    index: 0,
    phase: steps.length === 0 && !free ? 'done' : 'ready',
    free,
    paused: false,
    pausedAt: null,
    phaseStartedAt: now,
    restEndsAt: null,
    results: [],
  };
}

/** Restores a player for an interrupted session from the sets already saved. */
export function resumePlayer(
  steps: SessionStep[],
  saved: readonly SetResult[],
  now: number,
  free = false,
): PlayerState {
  const done = new Set(saved.map((r) => r.stepIndex));
  let all = steps;
  if (free) {
    all = saved.map((r, i) => ({ ...freeStep(i), exerciseId: r.exerciseId }));
    all.push(freeStep(all.length));
  }
  const index = all.findIndex((s) => !done.has(s.index));
  return {
    ...createPlayer(all, now, free),
    steps: all,
    index: index === -1 ? all.length - 1 : index,
    phase: index === -1 ? 'done' : 'ready',
    results: [...saved],
  };
}

export const currentStep = (s: PlayerState): SessionStep | null => s.steps[s.index] ?? null;
export const nextStep = (s: PlayerState): SessionStep | null => s.steps[s.index + 1] ?? null;

export function restRemainingMs(s: PlayerState, now: number): number {
  if (s.phase !== 'rest' || s.restEndsAt === null) return 0;
  const t = s.paused && s.pausedAt !== null ? s.pausedAt : now;
  return Math.max(0, s.restEndsAt - t);
}

/** Time spent in the current active set (excluding pauses). */
export function activeElapsedMs(s: PlayerState, now: number): number {
  if (s.phase !== 'active') return 0;
  const t = s.paused && s.pausedAt !== null ? s.pausedAt : now;
  return Math.max(0, t - s.phaseStartedAt);
}

/** 0..1 share of sets completed (plan mode). */
export function sessionProgress(s: PlayerState): number {
  if (s.free) return 0;
  return s.steps.length === 0 ? 1 : s.results.length / s.steps.length;
}

function advance(s: PlayerState, now: number, restS: number): PlayerState {
  const last = s.index >= s.steps.length - 1;
  if (last && !s.free) return { ...s, phase: 'done', restEndsAt: null, phaseStartedAt: now };
  const steps = s.free ? [...s.steps, freeStep(s.steps.length)] : s.steps;
  if (restS <= 0)
    return {
      ...s,
      steps,
      index: s.index + 1,
      phase: 'countdown',
      restEndsAt: null,
      phaseStartedAt: now,
    };
  return {
    ...s,
    steps,
    index: s.index + 1,
    phase: 'rest',
    phaseStartedAt: now,
    restEndsAt: now + restS * 1000,
  };
}

export function playerReducer(s: PlayerState, a: PlayerAction): PlayerState {
  if (s.phase === 'done') return s;
  if (s.paused && a.type !== 'resume' && a.type !== 'finish') return s;
  switch (a.type) {
    case 'begin':
      return s.phase === 'ready' || s.phase === 'rest'
        ? { ...s, phase: 'countdown', restEndsAt: null, phaseStartedAt: a.now }
        : s;
    case 'countdownDone':
      return s.phase === 'countdown' ? { ...s, phase: 'active', phaseStartedAt: a.now } : s;
    case 'completeSet': {
      const step = currentStep(s);
      if (s.phase !== 'active' || !step) return s;
      const exerciseId = a.result.exerciseId ?? step.exerciseId ?? 'unknown';
      const result: SetResult = {
        ...a.result,
        exerciseId,
        stepIndex: step.index,
        skipped: false,
        startedAt: s.phaseStartedAt,
        endedAt: a.now,
      };
      const steps = s.free
        ? s.steps.map((x) => (x.index === step.index ? { ...x, exerciseId } : x))
        : s.steps;
      return advance({ ...s, steps, results: [...s.results, result] }, a.now, step.restAfterS);
    }
    case 'tick':
      return s.phase === 'rest' && s.restEndsAt !== null && a.now >= s.restEndsAt
        ? { ...s, phase: 'countdown', restEndsAt: null, phaseStartedAt: a.now }
        : s;
    case 'skipRest':
      return s.phase === 'rest'
        ? { ...s, phase: 'countdown', restEndsAt: null, phaseStartedAt: a.now }
        : s;
    case 'extendRest': {
      if (s.phase !== 'rest' || s.restEndsAt === null) return s;
      const max = s.phaseStartedAt + MAX_REST_EXTENSION_S * 1000;
      return { ...s, restEndsAt: Math.min(max, s.restEndsAt + a.seconds * 1000) };
    }
    case 'skipExercise': {
      const step = currentStep(s);
      if (!step || s.free) return s;
      // Skip the remaining sets of this exercise (same exercise, consecutive steps).
      let end = s.index;
      while (
        end + 1 < s.steps.length &&
        s.steps[end + 1]!.exerciseId === step.exerciseId &&
        s.steps[end + 1]!.setNumber > s.steps[end]!.setNumber
      )
        end++;
      const skipped: SetResult[] = s.steps.slice(s.index, end + 1).map((x) => ({
        stepIndex: x.index,
        exerciseId: x.exerciseId ?? 'unknown',
        reps: 0,
        heldSeconds: null,
        avgQuality: null,
        formFlags: [],
        manualAdjustment: 0,
        cameraTracked: false,
        skipped: true,
        startedAt: a.now,
        endedAt: a.now,
      }));
      return advance(
        { ...s, index: end, results: [...s.results, ...skipped] },
        a.now,
        SKIP_TRANSITION_S,
      );
    }
    case 'pause':
      return s.phase === 'ready' ? s : { ...s, paused: true, pausedAt: a.now };
    case 'resume': {
      if (!s.paused || s.pausedAt === null) return s;
      const d = a.now - s.pausedAt;
      return {
        ...s,
        paused: false,
        pausedAt: null,
        // A countdown restarts from 3 after a pause (the user may have moved).
        phaseStartedAt: s.phase === 'countdown' ? a.now : s.phaseStartedAt + d,
        restEndsAt: s.restEndsAt === null ? null : s.restEndsAt + d,
      };
    }
    case 'finish':
      return { ...s, phase: 'done', paused: false, pausedAt: null, restEndsAt: null };
  }
}
