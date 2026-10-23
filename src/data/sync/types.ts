import type { Result } from '@/core';

import type { SyncTable } from '../schema/tables';

export type RemoteRow = Record<string, unknown>;

/** Server side of sync (Supabase in the app, an in-memory fake in tests). */
export interface RemoteStore {
  /** Idempotent upsert by id. The server ignores rows older than what it has (LWW). */
  upsert(table: SyncTable, rows: RemoteRow[]): Promise<Result<void>>;
  /** Rows of the signed-in user changed after `since` (server synced_at), ascending. */
  pull(
    table: SyncTable,
    userId: string,
    since: string | null,
    limit: number,
  ): Promise<Result<RemoteRow[]>>;
}

export interface SyncReport {
  pushed: number;
  pulled: number;
  failed: number;
  skipped?: 'busy' | 'no_user' | 'offline';
}
