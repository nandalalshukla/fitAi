import { create } from 'zustand';

import { DEFAULT_VOICE_SETTINGS, type VoiceSettings } from '@/features/voice/domain/types';

interface VoiceSettingsState extends VoiceSettings {
  update: (patch: Partial<VoiceSettings>) => void;
  reset: () => void;
}

/**
 * Voice coach settings. In-memory for now; persisted with MMKV in Phase 5
 * (the store shape is the persistence schema).
 */
export const useVoiceSettings = create<VoiceSettingsState>((set) => ({
  ...DEFAULT_VOICE_SETTINGS,
  update: (patch) => set(patch),
  reset: () => set(DEFAULT_VOICE_SETTINGS),
}));

export const getVoiceSettings = (): VoiceSettings => {
  const { update: _u, reset: _r, ...settings } = useVoiceSettings.getState();
  return settings;
};
