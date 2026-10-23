import type { SqlDatabase } from '../db/types';
import { systemClock, type Clock } from '../ids';
import { createPlanRepository } from './planRepository';
import { createProfileRepository } from './profileRepository';
import { createSettingsRepository } from './settingsRepository';
import { createWorkoutRepository } from './workoutRepository';

export function createRepositories(db: SqlDatabase, clock: Clock = systemClock) {
  const ctx = { db, clock };
  return {
    ctx,
    profiles: createProfileRepository(ctx),
    settings: createSettingsRepository(ctx),
    plans: createPlanRepository(ctx),
    workouts: createWorkoutRepository(ctx),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
export * from './accountData';
export * from './workoutStats';
