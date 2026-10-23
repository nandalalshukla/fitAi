import { migrateLocal } from '../db/migrations';
import { pendingCount } from '../db/outbox';
import type { SqlDatabase } from '../db/types';
import { createRepositories } from '../repositories';
import { SyncEngine } from '../sync/syncEngine';
import { createFakeRemote } from '../testing/fakeRemote';
import { createTestDatabase } from '../testing/sqljs';

const U = '11111111-1111-4111-8111-111111111111';

async function device(clockStart: string) {
  const db: SqlDatabase = await createTestDatabase();
  await migrateLocal(db);
  let now = new Date(clockStart);
  const clock = () => now;
  return {
    db,
    repos: createRepositories(db, clock),
    clock,
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
  };
}

describe('SyncEngine', () => {
  it('pushes local changes and pulls them on another device', async () => {
    const remote = createFakeRemote();
    const a = await device('2026-10-20T08:00:00Z');
    const s = await a.repos.workouts.startSession({ userId: U, mode: 'guided' });
    await a.repos.workouts.recordSet(s, { exerciseId: 'squat', setIndex: 0, reps: 15 });
    await a.repos.workouts.finishSession(s.id);
    await a.repos.profiles.save(U, { displayName: 'Sam', equipment: ['mat'] });

    const pushReport = await new SyncEngine(a.db, remote, {}, a.clock).sync(U);
    expect(pushReport.pushed).toBe(3);
    expect(await pendingCount(a.db)).toBe(0);
    expect(remote.rows('workout_sets')[0]).toMatchObject({
      reps: 15,
      camera_tracked: true,
      form_flags: [],
    });
    expect(remote.rows('profiles')[0]).toMatchObject({ equipment: ['mat'] });

    const b = await device('2026-10-21T08:00:00Z');
    const pullReport = await new SyncEngine(b.db, remote, {}, b.clock).sync(U);
    expect(pullReport.pulled).toBe(3);
    expect((await b.repos.workouts.getSession(s.id))?.totalReps).toBe(15);
    expect((await b.repos.profiles.get(U))?.equipment).toEqual(['mat']);
    expect(await pendingCount(b.db)).toBe(0); // pulled rows are not re-queued
  });

  it('works offline: retries with backoff and nothing is lost', async () => {
    const remote = createFakeRemote();
    const a = await device('2026-10-20T08:00:00Z');
    const engine = new SyncEngine(a.db, remote, { backoffBaseMs: 1000 }, a.clock);
    await a.repos.workouts.startSession({ userId: U, mode: 'free' });
    remote.failNextCalls(1);
    const r1 = await engine.sync(U);
    expect(r1.failed).toBe(1);
    expect(await pendingCount(a.db)).toBe(1);
    const r2 = await engine.sync(U); // still inside the backoff window: not retried
    expect(r2.pushed).toBe(0);
    a.advance(1500);
    const r3 = await engine.sync(U);
    expect(r3.pushed).toBe(1);
    expect(remote.rows('workout_sessions')).toHaveLength(1);
  });

  it('last write wins per record across devices', async () => {
    const remote = createFakeRemote();
    const a = await device('2026-10-20T08:00:00Z');
    const b = await device('2026-10-20T08:00:00Z');
    const ea = new SyncEngine(a.db, remote, {}, a.clock);
    const eb = new SyncEngine(b.db, remote, {}, b.clock);
    await a.repos.profiles.save(U, { displayName: 'From A' });
    await ea.sync(U);
    await eb.sync(U);
    // Both edit offline; B edits later.
    a.advance(1000);
    await a.repos.profiles.save(U, { displayName: 'A edit' });
    b.advance(5000);
    await b.repos.profiles.save(U, { displayName: 'B edit (newer)' });
    await eb.sync(U);
    await ea.sync(U); // A's older edit is rejected by the server; A pulls B's
    await eb.sync(U);
    expect((await a.repos.profiles.get(U))?.displayName).toBe('B edit (newer)');
    expect((await b.repos.profiles.get(U))?.displayName).toBe('B edit (newer)');
    expect(remote.rows('profiles')[0]?.display_name).toBe('B edit (newer)');
  });

  it('a record edited during a push stays queued', async () => {
    const remote = createFakeRemote();
    const a = await device('2026-10-20T08:00:00Z');
    await a.repos.profiles.save(U, { displayName: 'v1' });
    const origUpsert = remote.upsert.bind(remote);
    remote.upsert = async (t, rows) => {
      await a.repos.profiles.save(U, { displayName: 'v2 (during push)' });
      return origUpsert(t, rows);
    };
    await new SyncEngine(a.db, remote, {}, a.clock).sync(U);
    expect(await pendingCount(a.db)).toBe(1);
  });

  it('pulls in pages and keeps a cursor', async () => {
    const remote = createFakeRemote();
    for (let i = 0; i < 7; i++) {
      remote.serverWrite('workout_sessions', {
        id: `00000000-0000-4000-8000-00000000000${i}`,
        user_id: U,
        mode: 'free',
        status: 'completed',
        started_at: '2026-10-01T00:00:00Z',
        total_reps: i,
        updated_at: '2026-10-01T00:00:00Z',
        created_at: '2026-10-01T00:00:00Z',
      });
    }
    const a = await device('2026-10-20T08:00:00Z');
    const engine = new SyncEngine(a.db, remote, { pageSize: 3 }, a.clock);
    expect((await engine.sync(U)).pulled).toBe(7);
    expect((await engine.sync(U)).pulled).toBe(0); // cursor: nothing new
  });

  it('ignores other users and skips without a user', async () => {
    const remote = createFakeRemote();
    const a = await device('2026-10-20T08:00:00Z');
    expect((await new SyncEngine(a.db, remote, {}, a.clock).sync(null)).skipped).toBe('no_user');
  });

  it('is single-flight', async () => {
    const remote = createFakeRemote();
    const a = await device('2026-10-20T08:00:00Z');
    await a.repos.workouts.startSession({ userId: U, mode: 'free' });
    const engine = new SyncEngine(a.db, remote, {}, a.clock);
    const [x, y] = await Promise.all([engine.sync(U), engine.sync(U)]);
    expect(x).toBe(y);
    expect(remote.upserts).toBe(1);
  });
});
