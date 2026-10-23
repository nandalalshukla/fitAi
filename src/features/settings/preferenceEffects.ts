import { getService } from '@/core';

import { useWorkoutPrefs } from './workoutPrefsStore';

/** Applies preferences that drive services (analytics opt-out). Returns an unsubscribe. */
export function startPreferenceEffects(): () => void {
  const apply = () =>
    getService('analytics').setEnabled(useWorkoutPrefs.getState().analyticsEnabled);
  apply();
  return useWorkoutPrefs.subscribe(apply);
}
