import { writeSynced } from '../db/write';
import { iso, selectModel, type RepoContext } from './base';

interface SettingsRow {
  id: string;
  userId: string;
  data: Record<string, unknown>;
  createdAt: string;
}

/** Synced user settings blob (voice, units, reminders…); MMKV holds the live copy. */
export function createSettingsRepository(ctx: RepoContext) {
  return {
    async get(userId: string): Promise<Record<string, unknown> | null> {
      const r = await selectModel<SettingsRow>(
        ctx,
        'user_settings',
        'user_id = ? and deleted_at is null',
        [userId],
      );
      return r?.data ?? null;
    },
    async save(userId: string, data: Record<string, unknown>): Promise<void> {
      const now = iso(ctx);
      const existing = await selectModel<SettingsRow>(ctx, 'user_settings', 'user_id = ?', [
        userId,
      ]);
      await writeSynced(
        ctx.db,
        'user_settings',
        {
          id: userId,
          user_id: userId,
          data,
          created_at: existing?.createdAt ?? now,
          updated_at: now,
          deleted_at: null,
        },
        now,
      );
    },
  };
}
