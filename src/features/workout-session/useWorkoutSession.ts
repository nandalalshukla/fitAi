import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';

import { logger, track } from '@/core';
import { getExerciseInfo, getPlan, type Level } from '@/content';
import { getDataRuntime, queryKeys, requestSync, type WorkoutSession } from '@/data';
import { currentUserId } from '@/features/auth';
import { advancePlan } from '@/features/plans/hooks';
import { dayOf } from '@/features/plans/domain/schedule';

import {
  createPlayer,
  playerReducer,
  resumePlayer,
  type PlayerAction,
  type PlayerState,
  type SetResult,
} from './domain/player';
import { buildSteps, type SessionStep } from './domain/steps';

export interface WorkoutParams {
  mode: 'plan' | 'free';
  /** Plan day to perform (defaults to the active plan's current day). */
  day?: number;
  /** Resume this in-progress session. */
  resumeId?: string;
}

type Loaded = { state: PlayerState; planId: string | null; planDay: number | null; level: Level };

type Action = { type: 'init'; state: PlayerState } | PlayerAction;

function reducer(s: PlayerState | null, a: Action): PlayerState | null {
  if (a.type === 'init') return a.state;
  return s ? playerReducer(s, a) : s;
}

async function load(
  params: WorkoutParams,
  userId: string,
  now: number,
): Promise<Loaded & { session: WorkoutSession | null }> {
  const { workouts, plans } = getDataRuntime().repos;
  if (params.resumeId) {
    const session = await workouts.getSession(params.resumeId);
    // Deep links can carry any id: only the owner's unfinished sessions can be resumed.
    if (!session || session.userId !== userId || session.status !== 'in_progress')
      throw new Error('Session not found');
    const sets = await workouts.getSets(session.id);
    const saved: SetResult[] = sets.map((x) => ({
      stepIndex: x.setIndex,
      exerciseId: x.exerciseId,
      reps: x.reps,
      heldSeconds: x.heldSeconds,
      avgQuality: x.avgQuality,
      formFlags: x.formFlags,
      manualAdjustment: x.manualAdjustment,
      cameraTracked: x.cameraTracked,
      skipped: x.formFlags.includes('skipped'),
      startedAt: x.startedAt ? Date.parse(x.startedAt) : now,
      endedAt: x.endedAt ? Date.parse(x.endedAt) : now,
    }));
    const plan = session.planId ? getPlan(session.planId) : undefined;
    const planSession = plan && session.planDay ? dayOf(plan, session.planDay).session : null;
    const steps: SessionStep[] = planSession ? buildSteps(planSession, getExerciseInfo) : [];
    return {
      session,
      state: resumePlayer(steps, saved, now, session.mode === 'free'),
      planId: session.planId,
      planDay: session.planDay,
      level: plan?.level ?? 'intermediate',
    };
  }
  if (params.mode === 'free') {
    return {
      session: null,
      state: createPlayer([], now, true),
      planId: null,
      planDay: null,
      level: 'intermediate',
    };
  }
  const enrollment = await plans.getActive(userId);
  const plan = enrollment ? getPlan(enrollment.planId) : undefined;
  if (!enrollment || !plan) throw new Error('No active plan');
  const day = dayOf(plan, params.day ?? enrollment.currentDay);
  if (!day.session) throw new Error('Rest day');
  return {
    session: null,
    state: createPlayer(buildSteps(day.session, getExerciseInfo), now),
    planId: plan.id,
    planDay: day.day,
    level: plan.level,
  };
}

/**
 * Orchestrates one workout: the pure player state machine + persistence
 * (session row created at the first set, every finished set saved right away so
 * an interruption never loses work) + plan advancement when the session completes.
 */
export function useWorkoutSession(params: WorkoutParams) {
  const qc = useQueryClient();
  const [state, dispatch] = useReducer(reducer, null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [info, setInfo] = useState<{ level: Level; planId: string | null }>({
    level: 'intermediate',
    planId: null,
  });
  const [finishedId, setFinishedId] = useState<string | null>(null);
  const meta = useRef<Omit<Loaded, 'state'>>({
    planId: null,
    planDay: null,
    level: 'intermediate',
  });
  const session = useRef<WorkoutSession | null>(null);
  const saved = useRef(0);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const userId = currentUserId();
  const error = userId ? loadError : 'No user';

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    load(params, userId, Date.now())
      .then((r) => {
        if (cancelled) return;
        session.current = r.session;
        saved.current = r.state.results.length;
        meta.current = { planId: r.planId, planDay: r.planDay, level: r.level };
        setInfo({ level: r.level, planId: r.planId });
        dispatch({ type: 'init', state: r.state });
      })
      .catch(
        (e: unknown) => !cancelled && setLoadError(String(e instanceof Error ? e.message : e)),
      );
    return () => {
      cancelled = true;
    };
    // Params are fixed for the lifetime of the player screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const queue = useCallback((job: () => Promise<unknown>) => {
    writes.current = writes.current.then(job).catch((e: unknown) => {
      logger.error('Workout write failed', { error: String(e) });
    });
    return writes.current;
  }, []);

  const ensureSession = useCallback(async () => {
    if (session.current) return session.current;
    session.current = await getDataRuntime().repos.workouts.startSession({
      userId: userId!,
      mode: state?.free ? 'free' : 'guided',
      planId: meta.current.planId,
      planDay: meta.current.planDay,
    });
    void qc.invalidateQueries({ queryKey: queryKeys.inProgress(userId) });
    return session.current;
  }, [qc, state?.free, userId]);

  // Persist every newly finished (or skipped) set.
  useEffect(() => {
    if (!state || state.results.length <= saved.current) return;
    const fresh = state.results.slice(saved.current);
    saved.current = state.results.length;
    const steps = state.steps;
    void queue(async () => {
      const s = await ensureSession();
      for (const r of fresh) {
        const step = steps.find((x) => x.index === r.stepIndex);
        await getDataRuntime().repos.workouts.recordSet(s, {
          exerciseId: r.exerciseId,
          setIndex: r.stepIndex,
          targetReps: step?.targetReps ?? null,
          targetSeconds: step?.targetSeconds ?? null,
          reps: r.reps,
          heldSeconds: r.heldSeconds,
          avgQuality: r.avgQuality,
          formFlags: r.skipped ? ['skipped'] : r.formFlags,
          manualAdjustment: r.manualAdjustment,
          cameraTracked: r.cameraTracked,
          startedAt: new Date(r.startedAt).toISOString(),
          endedAt: new Date(r.endedAt).toISOString(),
        });
      }
    });
  }, [state, ensureSession, queue]);

  // Finish: store totals, advance the plan, refresh queries.
  useEffect(() => {
    if (state?.phase !== 'done' || finishedId !== null) return;
    void queue(async () => {
      const s = session.current;
      if (!s) {
        setFinishedId('');
        return;
      }
      const { repos } = getDataRuntime();
      const done = state.results.some((r) => !r.skipped);
      const finished = await repos.workouts.finishSession(s.id, done ? 'completed' : 'abandoned');
      const kept = state.results.filter((r) => !r.skipped);
      track('workout_finished', {
        status: finished.status === 'completed' ? 'completed' : 'abandoned',
        sets: kept.length,
        reps: finished.totalReps,
        minutes: Math.round((finished.durationS ?? 0) / 60),
        camera_sets: kept.filter((r) => r.cameraTracked).length,
      });
      if (done && meta.current.planId && meta.current.planDay !== null) {
        const enrollment = await repos.plans.getActive(finished.userId);
        const plan = getPlan(meta.current.planId);
        if (
          enrollment &&
          plan &&
          enrollment.planId === plan.id &&
          enrollment.currentDay === meta.current.planDay
        )
          await advancePlan(enrollment, plan);
      }
      requestSync();
      await qc.invalidateQueries({ queryKey: queryKeys.all(finished.userId) });
      setFinishedId(done ? finished.id : '');
    });
  }, [state, finishedId, queue, qc]);

  const act = useCallback((a: PlayerAction) => dispatch(a), []);

  return {
    state,
    error,
    level: info.level,
    planId: info.planId,
    /** Set once the finished session is saved: its id ('' when nothing was recorded). */
    finishedId,
    dispatch: act,
  };
}
