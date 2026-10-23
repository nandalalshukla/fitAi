import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mmkvStateStorage } from '@/core/storage';

export interface WorkoutPrefs {
  /** Draw the live skeleton over the camera preview. */
  showSkeleton: boolean;
  /** Translucent target pose next to the live skeleton. */
  showGhost: boolean;
  cameraPosition: 'front' | 'back';
  /** 'standard' = fast default model; 'high' = more accurate, heavier model. */
  modelAccuracy: 'standard' | 'high';
  /** Use the camera coach (false = always count manually). */
  useCamera: boolean;
  /** Anonymous, opt-out usage analytics. */
  analyticsEnabled: boolean;
}

export const DEFAULT_WORKOUT_PREFS: WorkoutPrefs = {
  showSkeleton: true,
  showGhost: false,
  cameraPosition: 'front',
  modelAccuracy: 'standard',
  useCamera: true,
  analyticsEnabled: true,
};

interface WorkoutPrefsState extends WorkoutPrefs {
  update: (patch: Partial<WorkoutPrefs>) => void;
}

/** Workout/camera preferences, persisted locally and mirrored to `user_settings` by settings sync. */
export const useWorkoutPrefs = create<WorkoutPrefsState>()(
  persist((set) => ({ ...DEFAULT_WORKOUT_PREFS, update: (patch) => set(patch) }), {
    name: 'workout-prefs',
    storage: createJSONStorage(() => mmkvStateStorage),
    version: 1,
    partialize: ({ update: _u, ...prefs }) => prefs,
  }),
);

export const getWorkoutPrefs = (): WorkoutPrefs => {
  const { update: _u, ...prefs } = useWorkoutPrefs.getState();
  return prefs;
};
