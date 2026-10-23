import { writeSynced } from '../db/write';
import { newId } from '../ids';
import { snakeize, type PlanEnrollment } from '../models';
import { iso, selectModel, type RepoContext } from './base';

export function createPlanRepository(ctx: RepoContext) {
  const save = async (e: PlanEnrollment) => {
    await writeSynced(ctx.db, 'plan_enrollments', snakeize(e), e.updatedAt);
    return e;
  };

  return {
    getActive: (userId: string) =>
      selectModel<PlanEnrollment>(
        ctx,
        'plan_enrollments',
        "user_id = ? and status = 'active' and deleted_at is null order by started_at desc",
        [userId],
      ),

    /** Starts a plan; any currently active plan is marked abandoned (one active plan per user). */
    async enroll(userId: string, planId: string): Promise<PlanEnrollment> {
      const now = iso(ctx);
      let created: PlanEnrollment | null = null;
      await ctx.db.withTransactionAsync(async () => {
        const current = await this.getActive(userId);
        if (current) await save({ ...current, status: 'abandoned', updatedAt: now });
        created = await save({
          id: newId(),
          userId,
          planId,
          status: 'active',
          startedAt: now,
          currentDay: 1,
          completedAt: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });
      });
      return created!;
    },

    async setDay(enrollment: PlanEnrollment, day: number): Promise<PlanEnrollment> {
      return save({ ...enrollment, currentDay: Math.max(1, day), updatedAt: iso(ctx) });
    },

    async complete(enrollment: PlanEnrollment): Promise<PlanEnrollment> {
      const now = iso(ctx);
      return save({ ...enrollment, status: 'completed', completedAt: now, updatedAt: now });
    },
  };
}
