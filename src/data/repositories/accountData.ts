import { decodeLocal } from '../db/codec';
import { enqueue } from '../db/outbox';
import { SYNC_ORDER, type SyncTable } from '../schema/tables';
import type { RepoContext } from './base';
import { iso } from './base';

/**
 * Guest → account migration: re-owns every local row of `fromUserId` to
 * `toUserId` (profiles/settings use id = user_id) and queues everything for upload.
 */
export async function reassignLocalUser(
  ctx: RepoContext,
  fromUserId: string,
  toUserId: string,
): Promise<number> {
  if (fromUserId === toUserId) return 0;
  const now = iso(ctx);
  let moved = 0;
  await ctx.db.withTransactionAsync(async () => {
    for (const table of SYNC_ORDER) {
      const singleton = table === 'profiles' || table === 'user_settings';
      if (singleton) {
        // The account may already have one (signed in on another device): keep the newer.
        const target = await ctx.db.getFirstAsync<{ updated_at: string }>(
          `select updated_at from ${table} where user_id = ?`,
          [toUserId],
        );
        const source = await ctx.db.getFirstAsync<{ updated_at: string }>(
          `select updated_at from ${table} where user_id = ?`,
          [fromUserId],
        );
        if (target && source && target.updated_at >= source.updated_at) {
          await ctx.db.runAsync(`delete from ${table} where user_id = ?`, [fromUserId]);
          continue;
        }
        await ctx.db.runAsync(`delete from ${table} where user_id = ?`, [toUserId]);
        await ctx.db.runAsync(
          `update ${table} set id = ?, user_id = ?, updated_at = ? where user_id = ?`,
          [toUserId, toUserId, now, fromUserId],
        );
      } else {
        await ctx.db.runAsync(`update ${table} set user_id = ?, updated_at = ? where user_id = ?`, [
          toUserId,
          now,
          fromUserId,
        ]);
      }
      const ids = await ctx.db.getAllAsync<{ id: string }>(
        `select id from ${table} where user_id = ?`,
        [toUserId],
      );
      for (const { id } of ids) await enqueue(ctx.db, table, id, now);
      moved += ids.length;
    }
  });
  return moved;
}

/** Everything stored locally about a user (in-app data export, works offline). */
export async function exportLocalData(
  ctx: RepoContext,
  userId: string,
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { exported_at: iso(ctx), user_id: userId, source: 'device' };
  for (const table of SYNC_ORDER) {
    const rows = await ctx.db.getAllAsync<Record<string, unknown>>(
      `select * from ${table} where user_id = ? and deleted_at is null`,
      [userId],
    );
    out[table] = rows.map((r) => decodeLocal(table as SyncTable, r));
  }
  return out;
}

/** Removes all local data (after account deletion / sign-out of a non-guest account). */
export async function wipeLocalData(ctx: RepoContext): Promise<void> {
  await ctx.db.withTransactionAsync(async () => {
    for (const table of [...SYNC_ORDER, 'outbox', 'sync_state'])
      await ctx.db.runAsync(`delete from ${table}`);
  });
}
