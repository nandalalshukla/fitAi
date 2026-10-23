import type { SupabaseClient } from '@supabase/supabase-js';

import { AppError, err, ok } from '@/core';

import type { SyncTable } from '../schema/tables';
import type { RemoteStore } from './types';

/** RemoteStore backed by Supabase (PostgREST). RLS restricts every query to the signed-in user. */
export function createSupabaseRemoteStore(client: SupabaseClient): RemoteStore {
  return {
    async upsert(table: SyncTable, rows) {
      const { error } = await client.from(table).upsert(rows, { onConflict: 'id' });
      return error
        ? err(new AppError('network', `${table} upsert: ${error.message}`, error))
        : ok(undefined);
    },
    async pull(table: SyncTable, userId, since, limit) {
      let q = client
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .order('synced_at', { ascending: true })
        .limit(limit);
      if (since) q = q.gt('synced_at', since);
      const { data, error } = await q;
      return error
        ? err(new AppError('network', `${table} pull: ${error.message}`, error))
        : ok((data ?? []) as Record<string, unknown>[]);
    },
  };
}
