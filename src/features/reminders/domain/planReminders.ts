/** Pure reminder planning (no expo-notifications import; unit-tested). */

export interface ReminderSettings {
  /** Daily workout reminder. */
  enabled: boolean;
  hour: number;
  minute: number;
  /** Evening nudge when a streak is about to break. */
  streakNudge: boolean;
}

export const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: false,
  hour: 18,
  minute: 0,
  streakNudge: true,
};

export type PlannedReminder =
  | { id: 'daily'; kind: 'daily'; hour: number; minute: number }
  | { id: 'streak'; kind: 'streak'; at: Date; streak: number };

/** Streak nudges go out at 20:00 local time (or 2 h after the daily reminder, if later). */
export const STREAK_NUDGE_HOUR = 20;
const LATEST_NUDGE_HOUR = 21;

export function planReminders(
  s: ReminderSettings,
  ctx: { now: Date; trainedToday: boolean; streak: number },
): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  if (s.enabled) out.push({ id: 'daily', kind: 'daily', hour: s.hour, minute: s.minute });
  if (s.streakNudge && ctx.streak > 0 && !ctx.trainedToday) {
    const hour = Math.min(
      LATEST_NUDGE_HOUR,
      Math.max(STREAK_NUDGE_HOUR, s.enabled ? s.hour + 2 : 0),
    );
    const at = new Date(
      ctx.now.getFullYear(),
      ctx.now.getMonth(),
      ctx.now.getDate(),
      hour,
      s.enabled && s.hour + 2 === hour ? s.minute : 0,
    );
    if (at.getTime() > ctx.now.getTime())
      out.push({ id: 'streak', kind: 'streak', at, streak: ctx.streak });
  }
  return out;
}
