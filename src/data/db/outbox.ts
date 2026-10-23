import type { SyncTable } from '../schema/tables';
import type { SqlDatabase } from './types';

export interface OutboxEntry {
  id: number;
  table_name: SyncTable;
  record_id: string;
  seq: number;
  attempts: number;
  next_attempt_at: string | null;
}

/** Marks a record as changed. Idempotent per record; bumps `seq` so in-flight pushes don't drop newer edits. */
export async function enqueue(
  db: SqlDatabase,
  table: SyncTable,
  recordId: string,
  nowIso: string,
): Promise<void> {
  await db.runAsync(
    `insert into outbox (table_name, record_id, seq, created_at)
     values (?, ?, (select coalesce(max(seq), 0) + 1 from outbox), ?)
     on conflict (table_name, record_id) do update set
       seq = (select coalesce(max(seq), 0) + 1 from outbox), attempts = 0, last_error = null, next_attempt_at = null`,
    [table, recordId, nowIso],
  );
}

export async function pendingCount(db: SqlDatabase): Promise<number> {
  const r = await db.getFirstAsync<{ n: number }>('select count(*) as n from outbox');
  return r?.n ?? 0;
}
