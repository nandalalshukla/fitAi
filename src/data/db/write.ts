import type { SyncTable } from '../schema/tables';
import { encodeLocal, type Row } from './codec';
import { enqueue } from './outbox';
import type { SqlDatabase } from './types';

/** Insert-or-replace a full row (all spec columns). */
export async function putRow(db: SqlDatabase, table: SyncTable, values: Row): Promise<void> {
  const { columns, params } = encodeLocal(table, values);
  await db.runAsync(
    `insert or replace into ${table} (${columns.join(', ')}) values (${columns.map(() => '?').join(', ')})`,
    params,
  );
}

/** Local write that will sync: row + outbox entry in one transaction. */
export async function writeSynced(
  db: SqlDatabase,
  table: SyncTable,
  values: Row,
  nowIso: string,
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await putRow(db, table, values);
    await enqueue(db, table, String(values.id), nowIso);
  });
}
