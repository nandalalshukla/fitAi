import { writeSynced } from '../db/write';
import { snakeize, type Profile } from '../models';
import { iso, selectModel, type RepoContext } from './base';

export type ProfilePatch = Partial<
  Omit<Profile, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'deletedAt'>
>;

export function createProfileRepository(ctx: RepoContext) {
  return {
    get: (userId: string) =>
      selectModel<Profile>(ctx, 'profiles', 'user_id = ? and deleted_at is null', [userId]),

    /** Creates or updates the user's profile (id = user id). */
    async save(userId: string, patch: ProfilePatch): Promise<Profile> {
      const now = iso(ctx);
      const existing = await this.get(userId);
      const next: Profile = {
        id: userId,
        userId,
        displayName: null,
        goal: null,
        fitnessLevel: null,
        equipment: [],
        daysPerWeek: null,
        units: 'metric',
        onboardingCompletedAt: null,
        createdAt: now,
        deletedAt: null,
        ...existing,
        ...patch,
        updatedAt: now,
      };
      await writeSynced(ctx.db, 'profiles', snakeize(next), now);
      return next;
    },
  };
}
