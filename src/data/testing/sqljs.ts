import initSqlJs, { type Database } from 'sql.js';

import type { SqlDatabase, SqlParam } from '../db/types';

/** In-memory SQLite (sql.js / WASM) implementing the expo-sqlite subset — TEST ONLY. */
export async function createTestDatabase(): Promise<SqlDatabase & { raw: Database }> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  const rows = <T>(sql: string, params: SqlParam[] = []): T[] => {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const out: T[] = [];
    while (stmt.step()) out.push(stmt.getAsObject() as T);
    stmt.free();
    return out;
  };
  let depth = 0;
  return {
    raw: db,
    async execAsync(sql) {
      db.exec(sql);
    },
    async runAsync(sql, params = []) {
      db.run(sql, params);
      const changes = db.getRowsModified();
      const last = rows<{ id: number }>('select last_insert_rowid() as id')[0]?.id ?? 0;
      return { changes, lastInsertRowId: last };
    },
    async getAllAsync<T>(sql: string, params: SqlParam[] = []) {
      return rows<T>(sql, params);
    },
    async getFirstAsync<T>(sql: string, params: SqlParam[] = []) {
      return rows<T>(sql, params)[0] ?? null;
    },
    async withTransactionAsync(task) {
      const outer = depth === 0;
      if (outer) db.exec('begin');
      depth++;
      try {
        await task();
        depth--;
        if (outer) db.exec('commit');
      } catch (e) {
        depth--;
        if (outer) db.exec('rollback');
        throw e;
      }
    },
  };
}
