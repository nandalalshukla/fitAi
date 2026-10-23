import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { logger } from '@/core';
import { i18n } from '@/i18n';

import type { PlannedReminder } from './domain/planReminders';

const CHANNEL_ID = 'reminders';
const t = (key: string, params?: object) =>
  String((i18n.t as (k: string, p?: object) => unknown)(key, params));

let configured = false;

/** Foreground presentation + Android channel. Safe to call repeatedly. */
export async function configureNotifications(): Promise<void> {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: t('reminders.channel'),
      // The enum is re-exported from a .types module the import plugin can't follow.
      // eslint-disable-next-line import/namespace
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

/** Asks for notification permission (only call from a user action). */
export async function requestNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Replaces all scheduled FormFit reminders with `planned`. Silent no-op without permission. */
export async function applyReminders(planned: readonly PlannedReminder[]): Promise<void> {
  try {
    await configureNotifications();
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (planned.length === 0) return;
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    for (const r of planned) {
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content:
          r.kind === 'daily'
            ? { title: t('reminders.dailyTitle'), body: t('reminders.dailyBody') }
            : {
                title: t('reminders.streakTitle', { count: r.streak }),
                body: t('reminders.streakBody'),
              },
        trigger:
          r.kind === 'daily'
            ? {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: r.hour,
                minute: r.minute,
                channelId: CHANNEL_ID,
              }
            : {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: r.at,
                channelId: CHANNEL_ID,
              },
      });
    }
  } catch (e) {
    logger.warn('Scheduling reminders failed', { error: String(e) });
  }
}
