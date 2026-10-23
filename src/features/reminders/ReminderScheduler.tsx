import { useEffect, useMemo } from 'react';

import { currentStreak, localDateKey, useSessionsQuery } from '@/data';
import { useUserId } from '@/features/auth';

import { planReminders } from './domain/planReminders';
import { applyReminders } from './notificationService';
import { useReminderSettings } from './reminderStore';

/**
 * Keeps scheduled notifications in line with the reminder settings and workout
 * history (a finished workout cancels today's streak nudge). Renders nothing.
 */
export function ReminderScheduler() {
  const userId = useUserId();
  const settings = useReminderSettings();
  const sessions = useSessionsQuery(userId);
  const { enabled, hour, minute, streakNudge } = settings;

  const ctx = useMemo(() => {
    const now = new Date();
    const list = sessions.data ?? [];
    const today = localDateKey(now);
    return {
      trainedToday: list.some(
        (s) => s.status === 'completed' && localDateKey(new Date(s.startedAt)) === today,
      ),
      streak: currentStreak(list, now),
    };
  }, [sessions.data]);

  useEffect(() => {
    if (sessions.isLoading) return;
    const id = setTimeout(() => {
      void applyReminders(
        userId
          ? planReminders({ enabled, hour, minute, streakNudge }, { now: new Date(), ...ctx })
          : [],
      );
    }, 500);
    return () => clearTimeout(id);
  }, [userId, enabled, hour, minute, streakNudge, ctx, sessions.isLoading]);

  return null;
}
