import { createMMKV } from 'react-native-mmkv';
import type { StateStorage } from 'zustand/middleware';

/** Fast synchronous key-value storage (settings, small app state). Auto-mocked in Jest. */
export const kv = createMMKV({ id: 'formfit' });

/** zustand `persist` adapter over MMKV. */
export const mmkvStateStorage: StateStorage = {
  getItem: (name) => kv.getString(name) ?? null,
  setItem: (name, value) => kv.set(name, value),
  removeItem: (name) => {
    kv.remove(name);
  },
};
