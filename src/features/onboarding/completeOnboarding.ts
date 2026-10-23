import type { Equipment, Goal, Level } from '@/content';
import { getDataRuntime, requestSync } from '@/data';
import { authService, currentUserId } from '@/features/auth';
import { requestNotificationPermission, useReminderSettings } from '@/features/reminders';

export interface OnboardingAnswers {
  goal: Goal;
  level: Level;
  equipment: Equipment[];
  daysPerWeek: number;
  planId: string;
  reminder: { enabled: boolean; hour: number; minute: number };
}

/**
 * Finishes onboarding: makes sure there is a (guest) user, saves the profile,
 * starts the chosen plan and sets up reminders. Idempotent.
 */
export async function completeOnboarding(a: OnboardingAnswers, now = new Date()): Promise<string> {
  let userId = currentUserId();
  if (!userId) {
    const r = await authService.continueAsGuest();
    if (!r.ok) throw r.error;
    userId = r.value.id;
  }
  const { profiles, plans } = getDataRuntime().repos;
  await profiles.save(userId, {
    goal: a.goal,
    fitnessLevel: a.level,
    equipment: a.equipment,
    daysPerWeek: a.daysPerWeek,
    onboardingCompletedAt: now.toISOString(),
  });
  const active = await plans.getActive(userId);
  if (active?.planId !== a.planId) await plans.enroll(userId, a.planId);
  if (a.reminder.enabled) {
    const granted = await requestNotificationPermission();
    useReminderSettings.getState().update({ ...a.reminder, enabled: granted });
  }
  requestSync();
  return userId;
}
