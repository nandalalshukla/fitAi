/** Data layer public API: local repositories (offline-first) + sync. */
export {
  initData,
  getDataRuntime,
  syncNow,
  requestSync,
  setSyncUser,
  onSyncComplete,
} from './runtime';
export type { DataRuntime } from './runtime';
export type * from './models';
export {
  reassignLocalUser,
  exportLocalData,
  wipeLocalData,
  dailyStats,
  currentStreak,
  personalBests,
  estimateCalories,
  localDateKey,
} from './repositories';
export { getSupabase } from './supabase/client';
export { pendingCount } from './db/outbox';
