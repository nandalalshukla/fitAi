import { logger } from '@/core';

import { decodeLocal, toRemote } from '../db/codec';
import type { OutboxEntry } from '../db/outbox';
import type { SqlDatabase } from '../db/types';
import { putRow } from '../db/write';
import { systemClock, type Clock } from '../ids';
import { SYNC_ORDER, type SyncTable } from '../schema/tables';
import type { RemoteStore, SyncReport } from './types';

export interface SyncOptions {
  batchSize: number;
  pageSize: number;
  /** Backoff after a failed push: base × 2^(attempts−1), capped. */
  backoffBaseMs: number;
  backoffMaxMs: number;
}

export const DEFAULT_SYNC_OPTIONS: SyncOptions = {
  batchSize: 100,
  pageSize: 500,
  backoffBaseMs: 5000,
  backoffMaxMs: 10 * 60 * 1000,
};

/**
 * Offline-first sync. Conflict policy: LAST-WRITE-WINS PER RECORD by the client
 * `updated_at` timestamp — enforced on the server (lww_guard trigger) for pushes
 * and locally for pulls. Deletes are tombstones (`deleted_at`).
 *
 * push: outbox entries (one per changed record) → read the CURRENT local row →
 *       upsert in batches, table by table in FK order → remove entries whose
 *       `seq` is unchanged (a record edited mid-push stays queued).
 * pull: per table, rows with server `synced_at` > cursor, paged; applied unless
 *       the local copy is newer; cursor advanced to the last `synced_at` seen.
 */
export class SyncEngine {
  private running: Promise<SyncReport> | null = null;
  private readonly opts: SyncOptions;

  constructor(
    private readonly db: SqlDatabase,
    private readonly remote: RemoteStore,
    options: Partial<SyncOptions> = {},
    private readonly clock: Clock = systemClock,
  ) {
    this.opts = { ...DEFAULT_SYNC_OPTIONS, ...options };
  }

  /** Single-flight: concurrent calls share the running sync. */
  sync(userId: string | null): Promise<SyncReport> {
    if (!userId) return Promise.resolve({ pushed: 0, pulled: 0, failed: 0, skipped: 'no_user' });
    if (this.running) return this.running;
    this.running = this.run(userId).finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async run(userId: string): Promise<SyncReport> {
    const report: SyncReport = { pushed: 0, pulled: 0, failed: 0 };
    for (const table of SYNC_ORDER) {
      const r = await this.pushTable(table, userId);
      report.pushed += r.pushed;
      report.failed += r.failed;
      if (r.failed > 0) break; // children (e.g. sets) would fail their FK: retry next round
    }
    for (const table of SYNC_ORDER) report.pulled += await this.pullTable(table, userId);
    return report;
  }

  private async pushTable(
    table: SyncTable,
    userId: string,
  ): Promise<{ pushed: number; failed: number }> {
    const now = this.clock().toISOString();
    const entries = await this.db.getAllAsync<OutboxEntry>(
      `select * from outbox where table_name = ? and (next_attempt_at is null or next_attempt_at <= ?) order by seq`,
      [table, now],
    );
    let pushed = 0;
    let failed = 0;
    for (let i = 0; i < entries.length; i += this.opts.batchSize) {
      const batch = entries.slice(i, i + this.opts.batchSize);
      const rows: Record<string, unknown>[] = [];
      const sendable: OutboxEntry[] = [];
      for (const e of batch) {
        const row = await this.db.getFirstAsync<Record<string, unknown>>(
          `select * from ${table} where id = ?`,
          [e.record_id],
        );
        if (!row || row.user_id !== userId) {
          // Gone locally or belongs to another (previous) user: nothing to send.
          await this.db.runAsync('delete from outbox where id = ? and seq = ?', [e.id, e.seq]);
          continue;
        }
        rows.push(toRemote(table, row));
        sendable.push(e);
      }
      if (rows.length === 0) continue;
      const res = await this.remote.upsert(table, rows);
      if (res.ok) {
        for (const e of sendable)
          await this.db.runAsync('delete from outbox where id = ? and seq = ?', [e.id, e.seq]);
        pushed += sendable.length;
      } else {
        failed += sendable.length;
        logger.warn('Sync push failed', { table, error: res.error.message });
        for (const e of sendable) {
          const attempts = e.attempts + 1;
          const delay = Math.min(
            this.opts.backoffMaxMs,
            this.opts.backoffBaseMs * 2 ** (attempts - 1),
          );
          await this.db.runAsync(
            'update outbox set attempts = ?, last_error = ?, next_attempt_at = ? where id = ? and seq = ?',
            [
              attempts,
              res.error.message.slice(0, 500),
              new Date(this.clock().getTime() + delay).toISOString(),
              e.id,
              e.seq,
            ],
          );
        }
        break; // keep FK order: don't push later batches/tables' dependents blindly
      }
    }
    return { pushed, failed };
  }

  private async pullTable(table: SyncTable, userId: string): Promise<number> {
    const key = `pull:${userId}:${table}`;
    let cursor =
      (
        await this.db.getFirstAsync<{ value: string }>(
          'select value from sync_state where key = ?',
          [key],
        )
      )?.value ?? null;
    let applied = 0;
    for (;;) {
      const res = await this.remote.pull(table, userId, cursor, this.opts.pageSize);
      if (!res.ok) {
        logger.warn('Sync pull failed', { table, error: res.error.message });
        return applied;
      }
      const rows = res.value;
      if (rows.length === 0) return applied;
      await this.db.withTransactionAsync(async () => {
        for (const remote of rows) {
          if (remote.user_id !== userId) continue;
          const local = await this.db.getFirstAsync<{ updated_at: string }>(
            `select updated_at from ${table} where id = ?`,
            [String(remote.id)],
          );
          const remoteUpdated = String(remote.updated_at ?? '');
          if (local && Date.parse(local.updated_at) > Date.parse(remoteUpdated)) continue; // local newer: will push
          await putRow(this.db, table, decodeLocal(table, remote));
          applied++;
        }
        cursor = String(rows[rows.length - 1]!.synced_at);
        await this.db.runAsync('insert or replace into sync_state (key, value) values (?, ?)', [
          key,
          cursor,
        ]);
      });
      if (rows.length < this.opts.pageSize) return applied;
    }
  }
}
