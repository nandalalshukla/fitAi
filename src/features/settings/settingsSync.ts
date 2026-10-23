import { logger } from '@/core';
import { getDataRuntime, onSyncComplete, requestSync } from '@/data';
import { currentUserId } from '@/features/auth/authStore';
import { useAppearanceStore } from '@/ui';

import { getVoiceSettings, useVoiceSettings } from './voiceSettingsStore';
import { getWorkoutPrefs, useWorkoutPrefs } from './workoutPrefsStore';
import { getReminderSettings, useReminderSettings } from '@/features/reminders/reminderStore';

/**
 * Mirrors device settings (MMKV) into the synced `user_settings` row so they
 * follow the user across devices. Local changes are saved (debounced) and
 * queued; after a sync, a newer remote copy is applied.
 */
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let applying = false;

function snapshot() {
  return {
    voice: getVoiceSettings(),
    appearance: useAppearanceStore.getState().preference,
    workout: getWorkoutPrefs(),
    reminders: getReminderSettings(),
  };
}

function scheduleSave() {
  if (applying) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const userId = currentUserId();
    if (!userId) return;
    try {
      await getDataRuntime().repos.settings.save(userId, snapshot());
      requestSync();
    } catch (e) {
      logger.warn('Saving settings failed', { error: String(e) });
    }
  }, 1500);
}

async function applyRemote() {
  const userId = currentUserId();
  if (!userId) return;
  const data = (await getDataRuntime().repos.settings.get(userId)) as ReturnType<
    typeof snapshot
  > | null;
  if (!data) return;
  applying = true;
  try {
    if (data.voice) useVoiceSettings.getState().update(data.voice);
    if (data.appearance) useAppearanceStore.getState().setPreference(data.appearance);
    if (data.workout) useWorkoutPrefs.getState().update(data.workout);
    if (data.reminders) useReminderSettings.getState().update(data.reminders);
  } finally {
    applying = false;
  }
}

export function startSettingsSync(): () => void {
  const unsubs = [
    useVoiceSettings.subscribe(scheduleSave),
    useAppearanceStore.subscribe(scheduleSave),
    useWorkoutPrefs.subscribe(scheduleSave),
    useReminderSettings.subscribe(scheduleSave),
    onSyncComplete((r) => {
      if (r.pulled > 0) void applyRemote();
    }),
  ];
  return () => unsubs.forEach((u) => u());
}
