import { TABLES, type SyncTable } from '../schema/tables';
import type { SqlParam } from './types';

export type Row = Record<string, unknown>;

/** Local SQLite row → plain values (JSON/arrays parsed, booleans as boolean). */
export function decodeLocal(table: SyncTable, row: Row): Row {
  const out: Row = {};
  for (const [col, type] of Object.entries(TABLES[table])) {
    const v = row[col];
    if (v === null || v === undefined) {
      out[col] = null;
    } else if (type === 'json' || type === 'textArray') {
      try {
        out[col] = typeof v === 'string' ? JSON.parse(v) : v;
      } catch {
        out[col] = type === 'json' ? {} : [];
      }
    } else if (type === 'boolean') {
      out[col] = v === 1 || v === true || v === '1';
    } else {
      out[col] = v;
    }
  }
  return out;
}

/** Plain values (local model or remote DTO) → SQLite parameters in column order. */
export function encodeLocal(
  table: SyncTable,
  values: Row,
): { columns: string[]; params: SqlParam[] } {
  const columns = Object.keys(TABLES[table]);
  const params = columns.map((col): SqlParam => {
    const v = values[col];
    const type = TABLES[table][col];
    if (v === null || v === undefined) return null;
    if (type === 'json' || type === 'textArray')
      return typeof v === 'string' ? v : JSON.stringify(v);
    if (type === 'boolean') return v ? 1 : 0;
    if (typeof v === 'number' || typeof v === 'string') return v;
    return String(v);
  });
  return { columns, params };
}

/** Local row → Supabase DTO (drops server-owned synced_at). */
export function toRemote(table: SyncTable, row: Row): Row {
  const d = decodeLocal(table, row);
  delete d.synced_at;
  return d;
}
