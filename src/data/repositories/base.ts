import { decodeLocal } from '../db/codec';
import type { SqlDatabase, SqlParam } from '../db/types';
import type { Clock } from '../ids';
import { camelize } from '../models';
import type { SyncTable } from '../schema/tables';

export interface RepoContext {
  db: SqlDatabase;
  clock: Clock;
}

export const iso = (ctx: RepoContext) => ctx.clock().toISOString();

/** Query rows of a synced table and map them to camelCase models (tombstones excluded by caller SQL). */
export async function selectModels<T>(
  ctx: RepoContext,
  table: SyncTable,
  where: string,
  params: SqlParam[] = [],
): Promise<T[]> {
  const rows = await ctx.db.getAllAsync<Record<string, unknown>>(
    `select * from ${table} where ${where}`,
    params,
  );
  return rows.map((r) => camelize<T>(decodeLocal(table, r)));
}

export async function selectModel<T>(
  ctx: RepoContext,
  table: SyncTable,
  where: string,
  params: SqlParam[] = [],
): Promise<T | null> {
  return (await selectModels<T>(ctx, table, `${where} limit 1`, params))[0] ?? null;
}
