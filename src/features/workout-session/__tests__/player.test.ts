import { getExerciseInfo, getPlan } from '@/content';
import type { WorkoutSet } from '@/data/models';

import {
  activeElapsedMs,
  createPlayer,
  currentStep,
  playerReducer,
  restRemainingMs,
  resumePlayer,
  sessionProgress,
  type PlayerAction,
  type PlayerState,
} from '../domain/player';
import { buildSteps } from '../domain/steps';
import { summarizeSession } from '../domain/summary';

const session = getPlan('beginner_foundations')!.schedule[0]!.session!;
const steps = buildSteps(session, getExerciseInfo);
const run = (s: PlayerState, ...actions: PlayerAction[]) => actions.reduce(playerReducer, s);
const result = {
  reps: 10,
  heldSeconds: null,
  avgQuality: 80,
  formFlags: [],
  manualAdjustment: 0,
  cameraTracked: true,
};

describe('buildSteps', () => {
  it('flattens blocks into sets with set numbers and targets', () => {
    const total = session.blocks.flatMap((b) => b.items).reduce((a, i) => a + i.sets, 0);
    expect(steps).toHaveLength(total);
    expect(steps.map((s) => s.index)).toEqual(steps.map((_, i) => i));
    const squat = steps.filter((s) => s.exerciseId === 'squat');
    expect(squat.map((s) => s.setNumber)).toEqual([1, 2]);
    expect(squat[0]).toMatchObject({ tracked: 'squat', mode: 'reps', targetReps: 10, setCount: 2 });
    expect(steps[0]).toMatchObject({ exerciseId: 'march_in_place', mode: 'time', tracked: null });
    expect(steps.at(-1)!.restAfterS).toBe(0);
  });
});

describe('player state machine', () => {
  const squatAt = steps.findIndex((s) => s.exerciseId === 'squat');
  const base = { ...createPlayer(steps, 0), index: squatAt };

  it('runs ready → countdown → active → rest → countdown', () => {
    let s = run(base, { type: 'begin', now: 0 }, { type: 'countdownDone', now: 3000 });
    expect(s.phase).toBe('active');
    expect(activeElapsedMs(s, 13_000)).toBe(10_000);
    s = playerReducer(s, { type: 'completeSet', now: 30_000, result });
    expect(s.phase).toBe('rest');
    expect(s.results[0]).toMatchObject({
      stepIndex: squatAt,
      exerciseId: 'squat',
      startedAt: 3000,
      endedAt: 30_000,
    });
    expect(currentStep(s)!.setNumber).toBe(2);
    expect(restRemainingMs(s, 40_000)).toBe(50_000);
    expect(playerReducer(s, { type: 'tick', now: 89_999 }).phase).toBe('rest');
    expect(playerReducer(s, { type: 'tick', now: 90_000 }).phase).toBe('countdown');
    expect(playerReducer(s, { type: 'skipRest', now: 31_000 }).phase).toBe('countdown');
  });

  it('extends rest up to a cap', () => {
    let s = run(
      base,
      { type: 'begin', now: 0 },
      { type: 'countdownDone', now: 0 },
      { type: 'completeSet', now: 0, result },
    );
    s = playerReducer(s, { type: 'extendRest', now: 0, seconds: 15 });
    expect(restRemainingMs(s, 0)).toBe(75_000);
    for (let i = 0; i < 40; i++) s = playerReducer(s, { type: 'extendRest', now: 0, seconds: 15 });
    expect(restRemainingMs(s, 0)).toBe(300_000);
  });

  it('pause freezes timers and resume shifts them', () => {
    let s = run(
      base,
      { type: 'begin', now: 0 },
      { type: 'countdownDone', now: 0 },
      { type: 'completeSet', now: 0, result },
    );
    s = playerReducer(s, { type: 'pause', now: 10_000 });
    expect(restRemainingMs(s, 100_000)).toBe(50_000);
    expect(playerReducer(s, { type: 'tick', now: 200_000 }).phase).toBe('rest');
    s = playerReducer(s, { type: 'resume', now: 100_000 });
    expect(restRemainingMs(s, 100_000)).toBe(50_000);
  });

  it('skips the remaining sets of an exercise', () => {
    const s = run(base, { type: 'begin', now: 0 }, { type: 'skipExercise', now: 5 });
    expect(s.results.map((r) => [r.exerciseId, r.skipped])).toEqual([
      ['squat', true],
      ['squat', true],
    ]);
    expect(currentStep(s)!.exerciseId).toBe(steps[squatAt + 2]!.exerciseId);
    expect(s.phase).toBe('rest');
  });

  it('finishes after the last set and on finish()', () => {
    const last = { ...createPlayer(steps, 0), index: steps.length - 1, phase: 'active' as const };
    expect(playerReducer(last, { type: 'completeSet', now: 1, result }).phase).toBe('done');
    expect(playerReducer(base, { type: 'finish', now: 1 }).phase).toBe('done');
    expect(sessionProgress({ ...base, results: [] })).toBe(0);
  });

  it('free mode keeps adding sets with the recognised exercise', () => {
    let s = createPlayer([], 0, true);
    s = run(s, { type: 'begin', now: 0 }, { type: 'countdownDone', now: 0 });
    s = playerReducer(s, {
      type: 'completeSet',
      now: 5,
      result: { ...result, exerciseId: 'push_up' },
    });
    expect(s.steps).toHaveLength(2);
    expect(s.steps[0]!.exerciseId).toBe('push_up');
    expect(s.phase).toBe('rest');
  });

  it('resumes an interrupted session at the first unsaved set', () => {
    const saved = [0, 1, 2].map((i) => ({
      ...result,
      stepIndex: i,
      exerciseId: steps[i]!.exerciseId!,
      skipped: false,
      startedAt: 0,
      endedAt: 1,
    }));
    const s = resumePlayer(steps, saved, 0);
    expect(s.index).toBe(3);
    expect(s.phase).toBe('ready');
    expect(sessionProgress(s)).toBeCloseTo(3 / steps.length);
  });
});

describe('summarizeSession', () => {
  const set = (exerciseId: string, reps: number, extra: Partial<WorkoutSet> = {}): WorkoutSet => ({
    id: Math.random().toString(),
    userId: 'u',
    sessionId: 's',
    exerciseId,
    setIndex: 0,
    targetReps: null,
    reps,
    targetSeconds: null,
    heldSeconds: null,
    avgQuality: 80,
    formFlags: [],
    manualAdjustment: 0,
    cameraTracked: true,
    startedAt: null,
    endedAt: null,
    createdAt: '',
    updatedAt: '',
    deletedAt: null,
    ...extra,
  });

  it('totals the session and finds personal bests', () => {
    const s = summarizeSession(
      [
        set('squat', 15),
        set('squat', 12, { avgQuality: 60 }),
        set('plank', 0, { heldSeconds: 50 }),
        set('lunge', 0, { formFlags: ['skipped'] }),
      ],
      [set('squat', 12), set('plank', 0, { heldSeconds: 40 })],
    );
    expect(s).toMatchObject({
      setsDone: 3,
      setsSkipped: 1,
      totalReps: 27,
      heldSeconds: 50,
      avgQuality: 73,
    });
    expect(s.newBests).toEqual([
      { exerciseId: 'squat', kind: 'reps', value: 15, previous: 12 },
      { exerciseId: 'plank', kind: 'hold', value: 50, previous: 40 },
    ]);
  });

  it('does not call a first attempt a personal best', () => {
    expect(summarizeSession([set('squat', 10)], []).newBests).toEqual([]);
  });
});
