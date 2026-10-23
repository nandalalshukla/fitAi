import { AppError, err, ok } from '@/core';

import type { SyncTable } from '../schema/tables';
import type { RemoteRow, RemoteStore } from '../sync/types';

/**
 * In-memory server with the same semantics as the Supabase schema: LWW by
 * client updated_at (older writes ignored) and a monotonic server synced_at.
 */
export function createFakeRemote() {
  const tables = new Map<SyncTable, Map<string, RemoteRow>>();
  let tick = 0;
  let failNext = 0;
  const table = (t: SyncTable) => {
    if (!tables.has(t)) tables.set(t, new Map());
    return tables.get(t)!;
  };
  const store: RemoteStore & {
    rows: (t: SyncTable) => RemoteRow[];
    serverWrite: (t: SyncTable, row: RemoteRow) => void;
    failNextCalls: (n: number) => void;
    upserts: number;
  } = {
    upserts: 0,
    rows: (t) => [...table(t).values()],
    failNextCalls: (n) => {
      failNext = n;
    },
    serverWrite(t, row) {
      const synced = new Date(Date.UTC(2030, 0, 1) + ++tick * 1000).toISOString();
      table(t).set(String(row.id), { ...row, synced_at: synced });
    },
    async upsert(t, rows) {
      if (failNext > 0) {
        failNext--;
        return err(new AppError('network', 'offline'));
      }
      store.upserts++;
      for (const r of rows) {
        const existing = table(t).get(String(r.id));
        if (existing && Date.parse(String(existing.updated_at)) > Date.parse(String(r.updated_at)))
          continue;
        store.serverWrite(t, r);
      }
      return ok(undefined);
    },
    async pull(t, userId, since, limit) {
      if (failNext > 0) {
        failNext--;
        return err(new AppError('network', 'offline'));
      }
      const rows = [...table(t).values()]
        .filter((r) => r.user_id === userId && (since === null || String(r.synced_at) > since))
        .sort((a, b) => String(a.synced_at).localeCompare(String(b.synced_at)))
        .slice(0, limit);
      return ok(rows.map((r) => ({ ...r })));
    },
  };
  return store;
}
