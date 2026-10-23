// Gesture Handler's official Jest mocks (avoids UI-runtime bindings in tests).
require('react-native-gesture-handler/jestSetup');
// Gesture Handler asks worklets for the UI runtime holder; the JS fallback used in Jest throws.
jest.mock('react-native-worklets', () => ({
  ...jest.requireActual('react-native-worklets'),
  getUIRuntimeHolder: () => ({}),
}));

// Reanimated ships a Jest mock that runs animations synchronously.
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

// Icon fonts can't load in Jest; render a plain Text placeholder carrying the icon name.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const { Text } = require('react-native');
  const Icon = ({ name, ...props }: { name: string }) => <Text {...props}>{name}</Text>;
  return { __esModule: true, default: Icon };
});

// MMKV (Nitro) can't load in Jest: in-memory replacement with the API we use.
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => {
    const m = new Map<string, string | number | boolean>();
    return {
      getString: (k: string) => (typeof m.get(k) === 'string' ? (m.get(k) as string) : undefined),
      getNumber: (k: string) => (typeof m.get(k) === 'number' ? (m.get(k) as number) : undefined),
      getBoolean: (k: string) =>
        typeof m.get(k) === 'boolean' ? (m.get(k) as boolean) : undefined,
      set: (k: string, v: string | number | boolean) => void m.set(k, v),
      remove: (k: string) => m.delete(k),
      contains: (k: string) => m.has(k),
      getAllKeys: () => [...m.keys()],
      clearAll: () => m.clear(),
    };
  },
}));

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);
