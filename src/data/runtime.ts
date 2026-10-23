import { logger } from '@/core';

import { getDatabase } from './db/expoDatabase';
import type { SqlDatabase } from './db/types';
import { createRepositories, type Repositories } from './repositories';
import { getSupabase } from './supabase/client';
import { createSupabaseRemoteStore } from './sync/supabaseRemoteStore';
import { SyncEngine } from './sync/syncEngine';
import type { SyncReport } from './sync/types';

export interface DataRuntime {
  db: SqlDatabase;
  repos: Repositories;
  /** Null when the backend isn't configured (fully local app). */
  sync: SyncEngine | null;
}

let runtime: DataRuntime | null = null;
let initializing: Promise<DataRuntime> | null = null;
const syncListeners = new Set<(r: SyncReport) => void>();

/** Opens the local database and wires repositories + sync. Safe to call repeatedly. */
export function initData(): Promise<DataRuntime> {
  if (runtime) return Promise.resolve(runtime);
  if (!initializing) {
    initializing = getDatabase().then((db) => {
      const supabase = getSupabase();
      runtime = {
        db,
        repos: createRepositories(db),
        sync: supabase ? new SyncEngine(db, createSupabaseRemoteStore(supabase)) : null,
      };
      return runtime;
    });
  }
  return initializing;
}

export function getDataRuntime(): DataRuntime {
  if (!runtime) throw new Error('Data runtime not initialized: call initData() first');
  return runtime;
}

/** Test seam: install a runtime built on a test database. */
export function setDataRuntimeForTests(r: DataRuntime | null): void {
  runtime = r;
  initializing = r ? Promise.resolve(r) : null;
}

let currentUser: () => string | null = () => null;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Tells sync whose data to sync (set by the auth layer). Remote sync only for backend users. */
export function setSyncUser(getUserId: () => string | null): void {
  currentUser = getUserId;
}

export function onSyncComplete(listener: (r: SyncReport) => void): () => void {
  syncListeners.add(listener);
  return () => syncListeners.delete(listener);
}

/** Runs a sync now (single-flight inside the engine). */
export async function syncNow(): Promise<SyncReport | null> {
  const r = runtime;
  if (!r?.sync) return null;
  try {
    const report = await r.sync.sync(currentUser());
    syncListeners.forEach((l) => l(report));
    return report;
  } catch (e) {
    logger.warn('Sync failed', { error: String(e) });
    return null;
  }
}

/** Debounced sync request after local writes. */
export function requestSync(delayMs = 2000): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void syncNow();
  }, delayMs);
}
