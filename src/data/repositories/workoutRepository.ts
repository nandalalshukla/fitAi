import { writeSynced } from '../db/write';
import { newId } from '../ids';
import {
  snakeize,
  type SessionMode,
  type SessionStatus,
  type WorkoutSession,
  type WorkoutSet,
} from '../models';
import { iso, selectModel, selectModels, type RepoContext } from './base';
import { estimateCalories } from './workoutStats';

export interface StartSessionInput {
  userId: string;
  mode: SessionMode;
  planId?: string | null;
  planDay?: number | null;
}

export type SetInput = Pick<WorkoutSet, 'exerciseId' | 'setIndex'> &
  Partial<
    Pick<
      WorkoutSet,
      | 'targetReps'
      | 'reps'
      | 'targetSeconds'
      | 'heldSeconds'
      | 'avgQuality'
      | 'formFlags'
      | 'manualAdjustment'
      | 'cameraTracked'
      | 'startedAt'
      | 'endedAt'
    >
  >;

export function createWorkoutRepository(ctx: RepoContext) {
  const saveSession = (s: WorkoutSession) =>
    writeSynced(ctx.db, 'workout_sessions', snakeize(s), s.updatedAt);
  const saveSet = (s: WorkoutSet) => writeSynced(ctx.db, 'workout_sets', snakeize(s), s.updatedAt);

  const repo = {
    async startSession(input: StartSessionInput): Promise<WorkoutSession> {
      const now = iso(ctx);
      const s: WorkoutSession = {
        id: newId(),
        userId: input.userId,
        planId: input.planId ?? null,
        planDay: input.planDay ?? null,
        mode: input.mode,
        status: 'in_progress',
        startedAt: now,
        endedAt: null,
        durationS: null,
        totalReps: 0,
        avgQuality: null,
        caloriesEst: null,
        notes: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      await saveSession(s);
      return s;
    },

    getSession: (id: string) =>
      selectModel<WorkoutSession>(ctx, 'workout_sessions', 'id = ?', [id]),

    /** An interrupted session to offer resuming. */
    getInProgress: (userId: string) =>
      selectModel<WorkoutSession>(
        ctx,
        'workout_sessions',
        "user_id = ? and status = 'in_progress' and deleted_at is null order by started_at desc",
        [userId],
      ),

    getSets: (sessionId: string) =>
      selectModels<WorkoutSet>(
        ctx,
        'workout_sets',
        'session_id = ? and deleted_at is null order by set_index',
        [sessionId],
      ),

    /** Records (or updates, by set index) a set of a session. */
    async recordSet(session: WorkoutSession, input: SetInput): Promise<WorkoutSet> {
      const now = iso(ctx);
      const existing = await selectModel<WorkoutSet>(
        ctx,
        'workout_sets',
        'session_id = ? and set_index = ? and exercise_id = ? and deleted_at is null',
        [session.id, input.setIndex, input.exerciseId],
      );
      const set: WorkoutSet = {
        id: existing?.id ?? newId(),
        userId: session.userId,
        sessionId: session.id,
        targetReps: null,
        reps: 0,
        targetSeconds: null,
        heldSeconds: null,
        avgQuality: null,
        formFlags: [],
        manualAdjustment: 0,
        cameraTracked: true,
        startedAt: null,
        endedAt: null,
        createdAt: existing?.createdAt ?? now,
        deletedAt: null,
        ...existing,
        ...input,
        updatedAt: now,
      };
      await saveSet(set);
      return set;
    },

    /** Completes (or abandons) a session and stores its totals. */
    async finishSession(
      id: string,
      status: Exclude<SessionStatus, 'in_progress'> = 'completed',
    ): Promise<WorkoutSession> {
      const s = await repo.getSession(id);
      if (!s) throw new Error(`Unknown session ${id}`);
      const sets = await repo.getSets(id);
      const now = ctx.clock();
      const durationS = Math.max(
        0,
        Math.round((now.getTime() - new Date(s.startedAt).getTime()) / 1000),
      );
      const q = sets.filter((x) => x.avgQuality !== null).map((x) => x.avgQuality!);
      const done: WorkoutSession = {
        ...s,
        status,
        endedAt: now.toISOString(),
        durationS,
        totalReps: sets.reduce((sum, x) => sum + x.reps, 0),
        avgQuality: q.length ? Math.round(q.reduce((a, b) => a + b, 0) / q.length) : null,
        caloriesEst: estimateCalories(durationS),
        updatedAt: now.toISOString(),
      };
      await saveSession(done);
      return done;
    },

    listSessions: (userId: string, fromIso: string, toIso: string) =>
      selectModels<WorkoutSession>(
        ctx,
        'workout_sessions',
        'user_id = ? and deleted_at is null and started_at >= ? and started_at < ? order by started_at desc',
        [userId, fromIso, toIso],
      ),

    allSets: (userId: string) =>
      selectModels<WorkoutSet>(ctx, 'workout_sets', 'user_id = ? and deleted_at is null', [userId]),

    /** Soft-deletes a session and its sets (tombstones sync to the server). */
    async deleteSession(id: string): Promise<void> {
      const s = await repo.getSession(id);
      if (!s) return;
      const now = iso(ctx);
      await ctx.db.withTransactionAsync(async () => {
        await saveSession({ ...s, deletedAt: now, updatedAt: now });
        for (const set of await repo.getSets(id))
          await saveSet({ ...set, deletedAt: now, updatedAt: now });
      });
    },
  };
  return repo;
}
