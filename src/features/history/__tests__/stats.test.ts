import type { WorkoutSession, WorkoutSet } from '@/data/models';

import {
  dailySeries,
  exerciseTrend,
  heatmap,
  sessionsThisWeek,
  startOfWeek,
  totals,
  trainedExercises,
  weeklySeries,
} from '../domain/stats';

// Thursday 23 Oct 2026, 10:00 local.
const now = new Date(2026, 9, 23, 10);
const session = (id: string, day: number, extra: Partial<WorkoutSession> = {}): WorkoutSession => ({
  id,
  userId: 'u',
  planId: null,
  planDay: null,
  mode: 'guided',
  status: 'completed',
  startedAt: new Date(2026, 9, day, 9).toISOString(),
  endedAt: null,
  durationS: 1800,
  totalReps: 100,
  avgQuality: 80,
  caloriesEst: 100,
  notes: null,
  createdAt: '',
  updatedAt: '',
  deletedAt: null,
  ...extra,
});
const set = (
  sessionId: string,
  exerciseId: string,
  reps: number,
  extra: Partial<WorkoutSet> = {},
): WorkoutSet => ({
  id: `${sessionId}-${exerciseId}-${reps}`,
  userId: 'u',
  sessionId,
  exerciseId,
  setIndex: 0,
  targetReps: null,
  reps,
  targetSeconds: null,
  heldSeconds: null,
  avgQuality: 70,
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

const sessions = [
  session('a', 23),
  session('b', 22, { avgQuality: 60, durationS: 600 }),
  session('c', 20),
  session('old', 1),
  session('x', 21, { status: 'abandoned' }),
];

describe('history stats', () => {
  it('weeks start on Monday', () => {
    expect(startOfWeek(now)).toEqual(new Date(2026, 9, 19));
    expect(startOfWeek(new Date(2026, 9, 25, 23))).toEqual(new Date(2026, 9, 19));
  });

  it('builds daily series ending today', () => {
    const s = dailySeries(sessions, 7, now);
    expect(s).toHaveLength(7);
    expect(s.at(-1)!.key).toBe('2026-10-23');
    expect(s.map((p) => p.sessions)).toEqual([0, 0, 0, 1, 0, 1, 1]);
    expect(s.at(-2)!.minutes).toBe(10);
    expect(totals(s)).toEqual({ sessions: 3, minutes: 70, reps: 300, quality: 73 });
  });

  it('builds weekly series', () => {
    const w = weeklySeries(sessions, 4, now);
    expect(w.map((p) => p.sessions)).toEqual([1, 0, 0, 3]);
    expect(weeklySeries(sessions, 4, now)[3]!.date).toEqual(new Date(2026, 9, 19));
  });

  it('counts completed sessions this week', () => {
    expect(sessionsThisWeek(sessions, now)).toBe(3);
  });

  it('builds a calendar heatmap with intensity levels and future cells', () => {
    const h = heatmap(sessions, 2, now);
    expect(h).toHaveLength(2);
    expect(h[1]![3]!).toMatchObject({ key: '2026-10-22', level: 1, minutes: 10 });
    expect(h[1]![4]!).toMatchObject({ key: '2026-10-23', level: 3 });
    expect(h[1]![5]!.future).toBe(true);
    expect(h[0]![0]!.key).toBe('2026-10-12');
  });

  it('tracks per-exercise bests per day, ignoring skipped and abandoned', () => {
    const sets = [
      set('c', 'squat', 10),
      set('c', 'squat', 12),
      set('a', 'squat', 15),
      set('a', 'squat', 0, { formFlags: ['skipped'] }),
      set('x', 'squat', 30),
      set('a', 'plank', 0, { heldSeconds: 45 }),
    ];
    expect(exerciseTrend('squat', sets, sessions)).toEqual([
      { date: '2026-10-20', value: 12, quality: 70 },
      { date: '2026-10-23', value: 15, quality: 70 },
    ]);
    expect(exerciseTrend('plank', sets, sessions)[0]!.value).toBe(45);
    expect(trainedExercises(sets)).toEqual(['squat', 'plank']);
  });
});
