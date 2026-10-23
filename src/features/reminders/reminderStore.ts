import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { mmkvStateStorage } from '@/core/storage';

import { DEFAULT_REMINDERS, type ReminderSettings } from './domain/planReminders';

interface ReminderState extends ReminderSettings {
  update: (patch: Partial<ReminderSettings>) => void;
}

export const useReminderSettings = create<ReminderState>()(
  persist((set) => ({ ...DEFAULT_REMINDERS, update: (patch) => set(patch) }), {
    name: 'reminders',
    storage: createJSONStorage(() => mmkvStateStorage),
    version: 1,
    partialize: ({ update: _u, ...s }) => s,
  }),
);

export const getReminderSettings = (): ReminderSettings => {
  const { update: _u, ...s } = useReminderSettings.getState();
  return s;
};
