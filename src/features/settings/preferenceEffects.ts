import { getService, setCrashReportingEnabled } from '@/core';

import { useWorkoutPrefs } from './workoutPrefsStore';

/** Applies preferences that drive services (analytics + crash-report opt-out). Returns an unsubscribe. */
export function startPreferenceEffects(): () => void {
  const apply = () => {
    const on = useWorkoutPrefs.getState().analyticsEnabled;
    getService('analytics').setEnabled(on);
    setCrashReportingEnabled(on);
  };
  apply();
  return useWorkoutPrefs.subscribe(apply);
}
