import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { migrateLocal } from './migrations';
import type { SqlDatabase } from './types';

/**
 * expo-sqlite adapter. expo-sqlite can't nest transactions and doesn't isolate
 * concurrent async transactions, so top-level transactions are serialized with a
 * mutex and nested ones join the outer transaction (depth counter).
 */
export function wrapExpoDatabase(db: SQLiteDatabase): SqlDatabase {
  let depth = 0;
  let tail: Promise<void> = Promise.resolve();
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: (sql, params = []) => db.runAsync(sql, params),
    getAllAsync: <T>(sql: string, params: (string | number | null)[] = []) =>
      db.getAllAsync<T>(sql, params),
    getFirstAsync: <T>(sql: string, params: (string | number | null)[] = []) =>
      db.getFirstAsync<T>(sql, params),
    async withTransactionAsync(task) {
      if (depth > 0) {
        await task(); // part of the enclosing transaction
        return;
      }
      const run = async () => {
        depth++;
        try {
          await db.withTransactionAsync(task);
        } finally {
          depth--;
        }
      };
      const next = tail.then(run, run);
      tail = next.catch(() => undefined);
      return next;
    },
  };
}

let opening: Promise<SqlDatabase> | null = null;

/** The app database (opened and migrated once). */
export function getDatabase(): Promise<SqlDatabase> {
  if (!opening) {
    opening = openDatabaseAsync('formfit.db').then(async (raw) => {
      const db = wrapExpoDatabase(raw);
      await migrateLocal(db);
      return db;
    });
  }
  return opening;
}
