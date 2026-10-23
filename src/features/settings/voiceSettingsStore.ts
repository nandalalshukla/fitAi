import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mmkvStateStorage } from '@/core/storage';

import { DEFAULT_VOICE_SETTINGS, type VoiceSettings } from '@/features/voice/domain/types';

interface VoiceSettingsState extends VoiceSettings {
  update: (patch: Partial<VoiceSettings>) => void;
  reset: () => void;
}

/**
 * Voice coach settings, persisted in MMKV (instant, offline) and mirrored to the
 * synced `user_settings` row by the settings sync (see src/data/settingsSync.ts).
 */
export const useVoiceSettings = create<VoiceSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_VOICE_SETTINGS,
      update: (patch) => set(patch),
      reset: () => set(DEFAULT_VOICE_SETTINGS),
    }),
    {
      name: 'voice-settings',
      storage: createJSONStorage(() => mmkvStateStorage),
      version: 1,
      partialize: ({ update: _u, reset: _r, ...settings }) => settings,
    },
  ),
);

export const getVoiceSettings = (): VoiceSettings => {
  const { update: _u, reset: _r, ...settings } = useVoiceSettings.getState();
  return settings;
};
