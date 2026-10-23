import type { SqlDatabase } from './types';

/**
 * Local SQLite migrations (append-only; never edit a shipped migration).
 * Schema version is tracked with PRAGMA user_version.
 */
export const LOCAL_MIGRATIONS: readonly string[] = [
  // v1 — initial schema (mirrors backend/supabase/migrations; JSON/arrays stored as TEXT).
  `
  create table profiles (
    id text primary key not null, user_id text not null unique,
    display_name text, goal text, fitness_level text, equipment text not null default '[]',
    days_per_week integer, units text not null default 'metric', onboarding_completed_at text,
    created_at text not null, updated_at text not null, synced_at text, deleted_at text
  );
  create table user_settings (
    id text primary key not null, user_id text not null unique, data text not null default '{}',
    created_at text not null, updated_at text not null, synced_at text, deleted_at text
  );
  create table plan_enrollments (
    id text primary key not null, user_id text not null, plan_id text not null, status text not null,
    started_at text not null, current_day integer not null default 1, completed_at text,
    created_at text not null, updated_at text not null, synced_at text, deleted_at text
  );
  create index plan_enrollments_user_idx on plan_enrollments (user_id, status);
  create table workout_sessions (
    id text primary key not null, user_id text not null, plan_id text, plan_day integer,
    mode text not null, status text not null, started_at text not null, ended_at text,
    duration_s integer, total_reps integer not null default 0, avg_quality integer, calories_est integer,
    notes text, created_at text not null, updated_at text not null, synced_at text, deleted_at text
  );
  create index workout_sessions_user_idx on workout_sessions (user_id, started_at);
  create table workout_sets (
    id text primary key not null, user_id text not null, session_id text not null, exercise_id text not null,
    set_index integer not null, target_reps integer, reps integer not null default 0, target_seconds integer,
    held_seconds integer, avg_quality integer, form_flags text not null default '[]',
    manual_adjustment integer not null default 0, camera_tracked integer not null default 1,
    started_at text, ended_at text, created_at text not null, updated_at text not null, synced_at text, deleted_at text
  );
  create index workout_sets_session_idx on workout_sets (session_id);
  create index workout_sets_user_idx on workout_sets (user_id, exercise_id);
  -- Sync outbox: one entry per changed record (latest state is read at push time).
  create table outbox (
    id integer primary key autoincrement, table_name text not null, record_id text not null,
    seq integer not null, created_at text not null, attempts integer not null default 0,
    last_error text, next_attempt_at text,
    unique (table_name, record_id)
  );
  create table sync_state (key text primary key not null, value text not null);
  `,
];

export async function migrateLocal(db: SqlDatabase): Promise<number> {
  await db.execAsync('pragma journal_mode = wal;');
  const row = await db.getFirstAsync<{ user_version: number }>('pragma user_version');
  let version = row?.user_version ?? 0;
  for (let v = version; v < LOCAL_MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(LOCAL_MIGRATIONS[v]!);
      await db.execAsync(`pragma user_version = ${v + 1}`);
    });
    version = v + 1;
  }
  return version;
}
