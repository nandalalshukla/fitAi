import * as Haptics from 'expo-haptics';

/**
 * Semantic haptics. Fire-and-forget; failures (e.g. unsupported device) are ignored.
 */
const safe = (p: Promise<void>) => {
  p.catch(() => undefined);
};

export const haptics = {
  tap: () => safe(Haptics.selectionAsync()),
  press: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  rep: () => safe(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  setComplete: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};

export type HapticKind = keyof typeof haptics;
