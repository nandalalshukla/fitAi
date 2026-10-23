import { migrateLocal } from '../db/migrations';
import { pendingCount } from '../db/outbox';
import type { SqlDatabase } from '../db/types';
import {
  createRepositories,
  currentStreak,
  dailyStats,
  exportLocalData,
  personalBests,
  reassignLocalUser,
} from '../repositories';
import { TABLES } from '../schema/tables';
import { createTestDatabase } from '../testing/sqljs';

const U = '11111111-1111-4111-8111-111111111111';

let db: SqlDatabase;
let now = new Date('2026-10-20T08:00:00Z');
const clock = () => now;
const advance = (ms: number) => {
  now = new Date(now.getTime() + ms);
};

beforeEach(async () => {
  db = await createTestDatabase();
  now = new Date('2026-10-20T08:00:00Z');
  await migrateLocal(db);
});

describe('local schema', () => {
  it('migrates idempotently and matches the shared table spec', async () => {
    expect(await migrateLocal(db)).toBe(1);
    for (const [table, cols] of Object.entries(TABLES)) {
      const info = await db.getAllAsync<{ name: string }>(`pragma table_info(${table})`);
      expect(info.map((c) => c.name).sort()).toEqual(Object.keys(cols).sort());
    }
  });
});

describe('repositories', () => {
  it('profile save creates then patches, and queues sync', async () => {
    const r = createRepositories(db, clock);
    await r.profiles.save(U, { displayName: 'Sam', equipment: ['mat'] });
    advance(1000);
    const p = await r.profiles.save(U, { fitnessLevel: 'beginner' });
    expect(p).toMatchObject({
      id: U,
      displayName: 'Sam',
      fitnessLevel: 'beginner',
      equipment: ['mat'],
    });
    expect((await r.profiles.get(U))?.equipment).toEqual(['mat']);
    expect(await pendingCount(db)).toBe(1); // coalesced per record
  });

  it('keeps one active plan: enrolling abandons the previous one', async () => {
    const r = createRepositories(db, clock);
    const first = await r.plans.enroll(U, 'beginner-foundations');
    advance(1000);
    const second = await r.plans.enroll(U, 'six-pack-abs');
    expect((await r.plans.getActive(U))?.id).toBe(second.id);
    const old = await db.getFirstAsync<{ status: string }>(
      'select status from plan_enrollments where id = ?',
      [first.id],
    );
    expect(old?.status).toBe('abandoned');
    expect((await r.plans.setDay(second, 3)).currentDay).toBe(3);
  });

  it('records a workout and computes totals on finish', async () => {
    const r = createRepositories(db, clock);
    const s = await r.workouts.startSession({
      userId: U,
      mode: 'guided',
      planId: 'six-pack-abs',
      planDay: 1,
    });
    expect((await r.workouts.getInProgress(U))?.id).toBe(s.id);
    await r.workouts.recordSet(s, {
      exerciseId: 'push_up',
      setIndex: 0,
      targetReps: 20,
      reps: 18,
      avgQuality: 90,
      formFlags: ['push_up.hips_sag'],
    });
    await r.workouts.recordSet(s, { exerciseId: 'squat', setIndex: 1, reps: 20, avgQuality: 80 });
    // Manual correction of an existing set updates it in place.
    await r.workouts.recordSet(s, {
      exerciseId: 'push_up',
      setIndex: 0,
      reps: 19,
      manualAdjustment: 1,
    });
    advance(30 * 60 * 1000);
    const done = await r.workouts.finishSession(s.id);
    expect(done).toMatchObject({
      status: 'completed',
      totalReps: 39,
      avgQuality: 85,
      durationS: 1800,
    });
    expect(done.caloriesEst).toBe(175); // 5 MET × 70 kg × 0.5 h (estimate)
    const sets = await r.workouts.getSets(s.id);
    expect(sets).toHaveLength(2);
    expect(sets[0]).toMatchObject({
      reps: 19,
      formFlags: ['push_up.hips_sag'],
      cameraTracked: true,
    });
    expect(await r.workouts.getInProgress(U)).toBeNull();
  });

  it('deletes as tombstones (synced), hidden from queries', async () => {
    const r = createRepositories(db, clock);
    const s = await r.workouts.startSession({ userId: U, mode: 'free' });
    await r.workouts.recordSet(s, { exerciseId: 'squat', setIndex: 0, reps: 5 });
    await r.workouts.deleteSession(s.id);
    expect(await r.workouts.getSets(s.id)).toEqual([]);
    expect(await r.workouts.listSessions(U, '2000-01-01', '2100-01-01')).toEqual([]);
    expect(await pendingCount(db)).toBe(2);
  });

  it('migrates guest data to the signed-in account', async () => {
    const r = createRepositories(db, clock);
    const guest = '99999999-9999-4999-8999-999999999999';
    await r.profiles.save(guest, { displayName: 'Guest' });
    const s = await r.workouts.startSession({ userId: guest, mode: 'free' });
    await r.workouts.recordSet(s, { exerciseId: 'squat', setIndex: 0, reps: 10 });
    const moved = await reassignLocalUser(r.ctx, guest, U);
    expect(moved).toBe(3);
    expect((await r.profiles.get(U))?.displayName).toBe('Guest');
    expect(await r.profiles.get(guest)).toBeNull();
    expect((await r.workouts.allSets(U)).map((x) => x.reps)).toEqual([10]);
    const data = await exportLocalData(r.ctx, U);
    expect((data.workout_sessions as unknown[]).length).toBe(1);
  });
});

describe('workout statistics', () => {
  const session = (startedAt: string, reps: number, q: number | null = 80) => ({
    id: startedAt,
    userId: U,
    planId: null,
    planDay: null,
    mode: 'guided' as const,
    status: 'completed' as const,
    startedAt,
    endedAt: null,
    durationS: 600,
    totalReps: reps,
    avgQuality: q,
    caloriesEst: null,
    notes: null,
    createdAt: startedAt,
    updatedAt: startedAt,
    deletedAt: null,
  });

  it('aggregates per local day', () => {
    const d = dailyStats([
      session('2026-10-18T09:00:00', 20),
      session('2026-10-18T18:00:00', 30, 90),
      session('2026-10-19T09:00:00', 10),
    ]);
    expect(d).toEqual([
      { date: '2026-10-18', sessions: 2, reps: 50, minutes: 20, avgQuality: 85 },
      { date: '2026-10-19', sessions: 1, reps: 10, minutes: 10, avgQuality: 80 },
    ]);
  });

  it('counts the streak through yesterday, broken by a missed day', () => {
    const s = [
      session('2026-10-16T09:00:00', 1),
      session('2026-10-18T09:00:00', 1),
      session('2026-10-19T09:00:00', 1),
    ];
    expect(currentStreak(s, new Date(2026, 9, 20, 12))).toBe(2); // 18th + 19th, today not done yet
    expect(
      currentStreak([...s, session('2026-10-20T07:00:00', 1)], new Date(2026, 9, 20, 12)),
    ).toBe(3);
    expect(currentStreak(s, new Date(2026, 9, 22, 12))).toBe(0);
  });

  it('finds personal bests per exercise', () => {
    const set = (exerciseId: string, reps: number, heldSeconds: number | null = null) => ({
      id: `${exerciseId}${reps}`,
      userId: U,
      sessionId: 's',
      exerciseId,
      setIndex: 0,
      targetReps: null,
      reps,
      targetSeconds: null,
      heldSeconds,
      avgQuality: 70,
      formFlags: [],
      manualAdjustment: 0,
      cameraTracked: true,
      startedAt: null,
      endedAt: null,
      createdAt: '',
      updatedAt: '',
      deletedAt: null,
    });
    expect(personalBests([set('squat', 12), set('squat', 20), set('plank', 0, 75)])).toEqual([
      { exerciseId: 'plank', maxReps: 0, maxHoldSeconds: 75, bestQuality: 70 },
      { exerciseId: 'squat', maxReps: 20, maxHoldSeconds: 0, bestQuality: 70 },
    ]);
  });
});
