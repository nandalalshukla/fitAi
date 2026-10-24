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

// Skia renders natively; in Jest draw nothing but keep the element tree.
jest.mock('@shopify/react-native-skia', () => {
  const { View } = require('react-native');
  const builder = () => {
    const b = {
      moveTo: () => b,
      lineTo: () => b,
      addCircle: () => b,
      addArc: () => b,
      build: () => ({}),
    };
    return b;
  };
  const Noop = () => null;
  return {
    Canvas: View,
    Path: Noop,
    Circle: Noop,
    Group: Noop,
    Line: Noop,
    Rect: Noop,
    RoundedRect: Noop,
    SweepGradient: Noop,
    LinearGradient: Noop,
    vec: (x: number, y: number) => ({ x, y }),
    Skia: { PathBuilder: { Make: builder }, Path: { Make: builder } },
  };
});

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => null),
  getPermissionsAsync: jest.fn(async () => ({ granted: false, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true, canAskAgain: true })),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => 'id'),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily', DATE: 'date' },
}));

jest.mock('expo-keep-awake', () => ({
  useKeepAwake: jest.fn(),
  activateKeepAwakeAsync: jest.fn(async () => undefined),
  deactivateKeepAwake: jest.fn(async () => undefined),
}));

// No camera in Jest: permission can be requested; preview renders nothing.
jest.mock('react-native-vision-camera', () => {
  const { View } = require('react-native');
  return {
    Camera: View,
    useCameraPermission: () => ({
      hasPermission: false,
      canRequestPermission: true,
      requestPermission: jest.fn(async () => true),
    }),
  };
});

// TFLite runs natively (Nitro); pose models are never loaded in Jest.
jest.mock('react-native-fast-tflite', () => ({
  loadTensorflowModel: jest.fn(async () => {
    throw new Error('TFLite is not available in Jest');
  }),
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  wrap: (c: unknown) => c,
}));

jest.mock('expo-screen-orientation', () => ({
  lockAsync: jest.fn(async () => undefined),
  unlockAsync: jest.fn(async () => undefined),
  OrientationLock: { PORTRAIT_UP: 'PORTRAIT_UP', DEFAULT: 'DEFAULT' },
}));
