import { useMutation, useQueryClient } from '@tanstack/react-query';

import { getPlan, type Plan, type PlanDay } from '@/content';
import { track } from '@/core';
import {
  getDataRuntime,
  queryKeys,
  requestSync,
  useEnrollmentQuery,
  type PlanEnrollment,
} from '@/data';
import { useUserId } from '@/features/auth';

import { dayOf, nextDay } from './domain/schedule';

export interface ActivePlan {
  enrollment: PlanEnrollment;
  plan: Plan;
  today: PlanDay;
}

/** The user's active plan with today's plan day (null when no plan is selected). */
export function useActivePlan(): { data: ActivePlan | null; isLoading: boolean } {
  const userId = useUserId();
  const q = useEnrollmentQuery(userId);
  const enrollment = q.data ?? null;
  const plan = enrollment ? getPlan(enrollment.planId) : undefined;
  return {
    isLoading: q.isLoading,
    data:
      enrollment && plan ? { enrollment, plan, today: dayOf(plan, enrollment.currentDay) } : null,
  };
}

/** Starts (or switches to) a plan. */
export function useEnrollPlan() {
  const userId = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (planId: string) => {
      if (!userId) throw new Error('No user');
      const previous = await getDataRuntime().repos.plans.getActive(userId);
      const e = await getDataRuntime().repos.plans.enroll(userId, planId);
      track('plan_enrolled', { plan: planId, switched: previous !== null });
      return e;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.enrollment(userId) });
      requestSync();
    },
  });
}

/** Moves the active plan to the next day (or completes it after the last day). */
export async function advancePlan(enrollment: PlanEnrollment, plan: Plan): Promise<PlanEnrollment> {
  const repo = getDataRuntime().repos.plans;
  const next = nextDay(plan, enrollment.currentDay);
  const updated =
    next === null ? await repo.complete(enrollment) : await repo.setDay(enrollment, next);
  requestSync();
  return updated;
}

export function useAdvancePlan() {
  const userId = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ enrollment, plan }: { enrollment: PlanEnrollment; plan: Plan }) =>
      advancePlan(enrollment, plan),
    onSuccess: () => void qc.invalidateQueries({ queryKey: queryKeys.enrollment(userId) }),
  });
}
