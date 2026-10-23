import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';

import { PGlite } from '@electric-sql/pglite';

/**
 * Runs the real migrations against Postgres (PGlite, WASM) with a minimal auth
 * shim and asserts Row Level Security + sync semantics. These are the "SQL
 * assertions" for RLS on every table.
 */
const HERE = import.meta.dirname;
const ROOT = path.join(HERE, '..');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const TABLES = ['profiles', 'user_settings', 'plan_enrollments', 'workout_sessions', 'workout_sets'];

let db: PGlite;

async function as(user: string | null, fn: () => Promise<void>) {
  await db.exec(`reset role; set role ${user ? 'authenticated' : 'anon'};`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [user ?? '']);
  try {
    await fn();
  } finally {
    await db.exec('reset role;');
  }
}

const session = (id: string, user: string, updatedAt = '2026-10-01T10:00:00Z') =>
  db.query(
    `insert into public.workout_sessions (id, user_id, mode, status, started_at, total_reps, updated_at)
     values ($1, $2, 'guided', 'completed', '2026-10-01T09:00:00Z', 20, $3)`,
    [id, user, updatedAt],
  );

before(async () => {
  db = new PGlite();
  await db.exec(fs.readFileSync(path.join(HERE, 'auth_shim.sql'), 'utf8'));
  const migrations = fs.readdirSync(path.join(ROOT, 'migrations')).filter((f) => f.endsWith('.sql')).sort();
  for (const m of migrations) await db.exec(fs.readFileSync(path.join(ROOT, 'migrations', m), 'utf8'));
  await db.query(`insert into auth.users (id, email) values ($1, 'a@example.com'), ($2, 'b@example.com')`, [A, B]);
});

after(async () => {
  await db.close();
});

describe('migrations', () => {
  it('enable RLS on every table', async () => {
    const r = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'`,
    );
    assert.deepEqual(r.rows.map((x) => x.relname).sort(), [...TABLES].sort());
    r.rows.forEach((x) => assert.equal(x.relrowsecurity, true));
  });
});

describe('row level security', () => {
  before(async () => {
    await as(A, async () => {
      await session('aaaaaaaa-0000-4000-8000-000000000001', A);
      await db.query(
        `insert into public.workout_sets (id, user_id, session_id, exercise_id, set_index, reps) values ($1, $2, $3, 'squat', 0, 20)`,
        ['aaaaaaaa-0000-4000-8000-0000000000f1', A, 'aaaaaaaa-0000-4000-8000-000000000001'],
      );
      await db.query(`insert into public.profiles (id, user_id, display_name) values ($1, $1, 'Alex')`, [A]);
    });
    await as(B, async () => {
      await session('bbbbbbbb-0000-4000-8000-000000000001', B);
    });
  });

  it('users only see their own rows', async () => {
    await as(A, async () => {
      const r = await db.query<{ id: string }>('select id from public.workout_sessions');
      assert.deepEqual(r.rows.map((x) => x.id), ['aaaaaaaa-0000-4000-8000-000000000001']);
    });
    await as(B, async () => {
      assert.equal((await db.query('select * from public.workout_sets')).rows.length, 0);
      assert.equal((await db.query('select * from public.profiles')).rows.length, 0);
    });
  });

  it('cannot insert rows for another user', async () => {
    await as(A, async () => {
      await assert.rejects(session('aaaaaaaa-0000-4000-8000-000000000099', B), /row-level security/);
    });
  });

  it("cannot attach a set to someone else's session", async () => {
    await as(A, async () => {
      await assert.rejects(
        db.query(
          `insert into public.workout_sets (id, user_id, session_id, exercise_id, set_index) values ($1, $2, $3, 'squat', 0)`,
          ['aaaaaaaa-0000-4000-8000-0000000000f2', A, 'bbbbbbbb-0000-4000-8000-000000000001'],
        ),
        /row-level security/,
      );
    });
  });

  it("cannot update or delete someone else's rows (silently 0 rows)", async () => {
    await as(A, async () => {
      const u = await db.query(`update public.workout_sessions set total_reps = 999 where id = 'bbbbbbbb-0000-4000-8000-000000000001'`);
      const d = await db.query(`delete from public.workout_sessions where id = 'bbbbbbbb-0000-4000-8000-000000000001'`);
      assert.equal(u.affectedRows, 0);
      assert.equal(d.affectedRows, 0);
    });
    const r = await db.query<{ total_reps: number }>(`select total_reps from public.workout_sessions where id = 'bbbbbbbb-0000-4000-8000-000000000001'`);
    assert.equal(r.rows[0]?.total_reps, 20);
  });

  it('anonymous (not signed-in) clients see nothing', async () => {
    await as(null, async () => {
      await assert.rejects(db.query('select * from public.workout_sessions'), /permission denied/);
    });
  });

  it('user_id cannot be reassigned', async () => {
    await as(A, async () => {
      await assert.rejects(
        db.query(`update public.workout_sessions set user_id = $1, updated_at = now() where id = 'aaaaaaaa-0000-4000-8000-000000000001'`, [B]),
      );
    });
  });
});

describe('sync semantics', () => {
  const id = 'aaaaaaaa-0000-4000-8000-0000000000aa';

  it('last-write-wins: an older client timestamp does not overwrite a newer row', async () => {
    await as(A, async () => {
      await session(id, A, '2026-10-02T10:00:00Z');
      await db.query(
        `insert into public.workout_sessions (id, user_id, mode, status, started_at, total_reps, updated_at)
         values ($1, $2, 'guided', 'completed', '2026-10-01T09:00:00Z', 5, '2026-10-01T10:00:00Z')
         on conflict (id) do update set total_reps = excluded.total_reps, updated_at = excluded.updated_at`,
        [id, A],
      );
      const r = await db.query<{ total_reps: number }>('select total_reps from public.workout_sessions where id = $1', [id]);
      assert.equal(r.rows[0]?.total_reps, 20);
      // A newer write wins.
      await db.query(
        `insert into public.workout_sessions (id, user_id, mode, status, started_at, total_reps, updated_at)
         values ($1, $2, 'guided', 'completed', '2026-10-01T09:00:00Z', 30, '2026-10-03T10:00:00Z')
         on conflict (id) do update set total_reps = excluded.total_reps, updated_at = excluded.updated_at`,
        [id, A],
      );
      const r2 = await db.query<{ total_reps: number }>('select total_reps from public.workout_sessions where id = $1', [id]);
      assert.equal(r2.rows[0]?.total_reps, 30);
    });
  });

  it('synced_at is server-assigned and moves forward on every write', async () => {
    await as(A, async () => {
      const before = await db.query<{ synced_at: Date }>('select synced_at from public.workout_sessions where id = $1', [id]);
      await db.query(`update public.workout_sessions set notes = 'x', updated_at = '2026-10-04T00:00:00Z', synced_at = '2000-01-01' where id = $1`, [id]);
      const after = await db.query<{ synced_at: Date }>('select synced_at from public.workout_sessions where id = $1', [id]);
      assert.ok(new Date(after.rows[0]!.synced_at).getTime() > new Date(before.rows[0]!.synced_at).getTime());
    });
  });

  it('allows only one active plan enrollment per user', async () => {
    await as(A, async () => {
      const ins = (eid: string) =>
        db.query(
          `insert into public.plan_enrollments (id, user_id, plan_id, status, started_at) values ($1, $2, 'six-pack-abs', 'active', now())`,
          [eid, A],
        );
      await ins('aaaaaaaa-0000-4000-8000-0000000000e1');
      await assert.rejects(ins('aaaaaaaa-0000-4000-8000-0000000000e2'), /duplicate key/);
    });
  });
});

describe('account functions', () => {
  it('export_my_data returns only the caller’s data', async () => {
    await as(A, async () => {
      const r = await db.query<{ data: { user_id: string; workout_sessions: { user_id: string }[]; profile: { display_name: string } } }>(
        'select public.export_my_data() as data',
      );
      const data = r.rows[0]!.data;
      assert.equal(data.user_id, A);
      assert.equal(data.profile.display_name, 'Alex');
      assert.ok(data.workout_sessions.length > 0);
      data.workout_sessions.forEach((s) => assert.equal(s.user_id, A));
    });
  });

  it('anon cannot call account functions', async () => {
    await as(null, async () => {
      await assert.rejects(db.query('select public.delete_my_account()'), /permission denied/);
    });
  });

  it('delete_my_account removes the user and cascades to all their data', async () => {
    await as(B, async () => {
      await db.query('select public.delete_my_account()');
    });
    const users = await db.query('select id from auth.users where id = $1', [B]);
    const rows = await db.query('select id from public.workout_sessions where user_id = $1', [B]);
    assert.equal(users.rows.length, 0);
    assert.equal(rows.rows.length, 0);
    const a = await db.query('select id from public.workout_sessions where user_id = $1', [A]);
    assert.ok(a.rows.length > 0);
  });
});
