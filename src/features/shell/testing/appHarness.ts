import { kv } from '@/core/storage';
import { getDataRuntime, initData } from '@/data';
import { setDataRuntimeForTests } from '@/data/runtime';
import { authService, useAuthStore } from '@/features/auth';
import { useWorkoutPrefs } from '@/features/settings/workoutPrefsStore';
import { queryClient } from '@/features/shell/DataProvider';

/**
 * Helpers for full-app (expo-router) tests. Test files still declare their own
 * jest.mock()s for expo-font, expo-splash-screen and '@/data/db/expoDatabase'
 * (mocks are hoisted per file).
 */

/** Fresh app state: empty storage, query cache, database and auth. */
export function resetApp(): void {
  kv.clearAll();
  queryClient.clear();
  setDataRuntimeForTests(null);
  useAuthStore.setState({ status: 'initializing', user: null });
  // No camera in Jest: count manually.
  useWorkoutPrefs.getState().update({ useCamera: false });
}

/** A guest who finished onboarding and started `planId` (at plan day `day`). */
export async function seedUser(planId = 'beginner_foundations', day = 1): Promise<string> {
  await initData();
  const r = await authService.continueAsGuest();
  if (!r.ok) throw r.error;
  const { profiles, plans } = getDataRuntime().repos;
  await profiles.save(r.value.id, {
    goal: 'general',
    fitnessLevel: 'beginner',
    onboardingCompletedAt: new Date().toISOString(),
  });
  const e = await plans.enroll(r.value.id, planId);
  if (day > 1) await plans.setDay(e, day);
  return r.value.id;
}
