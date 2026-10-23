/**
 * Synced tables: column names/types shared by the local SQLite schema, the
 * sync mappers and the Supabase migrations (a DB test checks they agree).
 * No imports, so the Node DB test can load it directly.
 */
export type ColumnType = 'text' | 'integer' | 'boolean' | 'json' | 'textArray';

export type SyncTable =
  'profiles' | 'user_settings' | 'plan_enrollments' | 'workout_sessions' | 'workout_sets';

export const SYNC_COLUMNS = {
  updated_at: 'text',
  synced_at: 'text',
  deleted_at: 'text',
  created_at: 'text',
} as const;

export const TABLES: Record<SyncTable, Record<string, ColumnType>> = {
  profiles: {
    id: 'text',
    user_id: 'text',
    display_name: 'text',
    goal: 'text',
    fitness_level: 'text',
    equipment: 'textArray',
    days_per_week: 'integer',
    units: 'text',
    onboarding_completed_at: 'text',
    ...SYNC_COLUMNS,
  },
  user_settings: {
    id: 'text',
    user_id: 'text',
    data: 'json',
    ...SYNC_COLUMNS,
  },
  plan_enrollments: {
    id: 'text',
    user_id: 'text',
    plan_id: 'text',
    status: 'text',
    started_at: 'text',
    current_day: 'integer',
    completed_at: 'text',
    ...SYNC_COLUMNS,
  },
  workout_sessions: {
    id: 'text',
    user_id: 'text',
    plan_id: 'text',
    plan_day: 'integer',
    mode: 'text',
    status: 'text',
    started_at: 'text',
    ended_at: 'text',
    duration_s: 'integer',
    total_reps: 'integer',
    avg_quality: 'integer',
    calories_est: 'integer',
    notes: 'text',
    ...SYNC_COLUMNS,
  },
  workout_sets: {
    id: 'text',
    user_id: 'text',
    session_id: 'text',
    exercise_id: 'text',
    set_index: 'integer',
    target_reps: 'integer',
    reps: 'integer',
    target_seconds: 'integer',
    held_seconds: 'integer',
    avg_quality: 'integer',
    form_flags: 'textArray',
    manual_adjustment: 'integer',
    camera_tracked: 'boolean',
    started_at: 'text',
    ended_at: 'text',
    ...SYNC_COLUMNS,
  },
};

/** Push/pull order respects foreign keys (sessions before sets). */
export const SYNC_ORDER: readonly SyncTable[] = [
  'profiles',
  'user_settings',
  'plan_enrollments',
  'workout_sessions',
  'workout_sets',
];
