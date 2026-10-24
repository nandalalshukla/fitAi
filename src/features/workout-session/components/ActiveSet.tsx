import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type { ExerciseInfo, Level } from '@/content';
import {
  useLiveExercise,
  type EngineEvent,
  type ExerciseId,
  type LiveFormLevel,
} from '@/features/exercises';
import type { Pose } from '@/features/pose';
import type { VoiceCoach } from '@/features/voice';
import { useLooseT, useTranslation } from '@/i18n';
import {
  AnimatedCounter,
  Button,
  Card,
  Icon,
  PressableScale,
  ProgressRing,
  Text,
  haptics,
  useTheme,
} from '@/ui';

import type { SessionStep } from '../domain/steps';
import { formatClock, stepTarget } from '../format';
import { FormBanner } from './FormBanner';
import { usePlayerLayout } from './usePlayerLayout';
import { useTicker } from './useTicker';

export interface SetOutcome {
  reps: number;
  heldSeconds: number | null;
  avgQuality: number | null;
  formFlags: string[];
  manualAdjustment: number;
  cameraTracked: boolean;
  exerciseId?: string;
}

export interface ActiveSetProps {
  step: SessionStep;
  info: ExerciseInfo | undefined;
  /** Live pose from the camera, or null when counting manually. */
  pose: SharedValue<Pose | null> | null;
  formLevel: SharedValue<LiveFormLevel>;
  level: Level;
  free: boolean;
  paused: boolean;
  /** Active time in this set, ms (pause-aware). */
  elapsedMs: (now: number) => number;
  coach: VoiceCoach;
  onComplete: (outcome: SetOutcome) => void;
  /** Free mode: the classifier recognised the exercise. */
  onDetected?: (exercise: ExerciseId) => void;
}

/** Delay between reaching the target and moving on, so "set complete" is heard. */
const AUTO_COMPLETE_DELAY_MS = 700;

/** The set being performed: camera-coached when possible, otherwise manual tap/timer. */
export function ActiveSet(props: ActiveSetProps) {
  const { step, pose, free } = props;
  const [override, setOverride] = useState<ExerciseId | null>(null);
  const exercise = override ?? step.tracked;
  if (pose && (exercise || free)) {
    return (
      <CameraSet
        key={override ?? 'plan'}
        {...props}
        pose={pose}
        exercise={exercise ?? 'auto'}
        onSwitch={setOverride}
      />
    );
  }
  return <ManualSet {...props} />;
}

function useAutoComplete(done: boolean, complete: () => void, paused: boolean) {
  const fired = useRef(false);
  useEffect(() => {
    if (!done || fired.current || paused) return;
    const id = setTimeout(() => {
      fired.current = true;
      complete();
    }, AUTO_COMPLETE_DELAY_MS);
    return () => clearTimeout(id);
  }, [done, complete, paused]);
}

function CameraSet({
  step,
  info,
  pose,
  formLevel,
  level,
  free,
  paused,
  elapsedMs,
  coach,
  onComplete,
  onDetected,
  exercise,
  onSwitch,
}: ActiveSetProps & {
  pose: SharedValue<Pose | null>;
  exercise: ExerciseId | 'auto';
  onSwitch: (e: ExerciseId) => void;
}) {
  const { t } = useTranslation();
  const lt = useLooseT();
  const now = useTicker(!paused);
  const manual = useRef(0);
  const onEvents = useCallback(
    (events: EngineEvent[], avgRepMs: number | null) => {
      if (paused) return;
      for (const e of events) {
        if (e.type === 'rep') haptics.rep();
        if (e.type === 'form' && e.severity === 'critical') haptics.warning();
      }
      coach.handleEngineEvents(events, { targetReps: step.targetReps, avgRepMs });
    },
    [coach, paused, step.targetReps],
  );
  const live = useLiveExercise(pose, exercise, level, onEvents, formLevel);
  const snap = live.snapshot;
  const isHold = live.active === 'plank';
  const heldMs = isHold ? (live.read()?.heldMs ?? 0) : 0;
  const reps = snap?.reps ?? 0;
  const elapsed = elapsedMs(now);

  useEffect(() => {
    if (free && live.active) onDetected?.(live.active);
  }, [free, live.active, onDetected]);

  const suggested = useRef<string | null>(null);
  useEffect(() => {
    if (live.suggestion && suggested.current !== live.suggestion) {
      suggested.current = live.suggestion;
      coach.say({
        id: 'switch_suggest',
        textKey: 'voice.switchSuggest',
        params: { name: t(`exercises.names.${live.suggestion}`) },
      });
    }
  }, [live.suggestion, coach, t]);

  const complete = useCallback(() => {
    const s = live.read();
    onComplete({
      reps: s?.reps ?? 0,
      heldSeconds: isHold
        ? Math.round((s?.heldMs ?? 0) / 1000)
        : step.targetSeconds !== null
          ? Math.round(elapsedMs(Date.now()) / 1000)
          : null,
      avgQuality: s?.averageQuality ?? null,
      formFlags: live.formFlags(),
      manualAdjustment: manual.current,
      cameraTracked: true,
      exerciseId: free
        ? (live.active ?? undefined)
        : exercise !== step.tracked
          ? exercise
          : undefined,
    });
  }, [live, onComplete, isHold, step, elapsedMs, free, exercise]);

  const target = step.targetSeconds;
  const done =
    !free &&
    (target !== null
      ? (isHold ? heldMs : elapsed) >= target * 1000
      : step.targetReps !== null && reps >= step.targetReps);
  useAutoComplete(done, complete, paused);

  const adjust = (d: number) => {
    manual.current += d;
    live.adjust(d);
    haptics.tap();
  };

  return (
    <SetLayout
      banner={
        live.suggestion ? (
          <Card elevated testID="switch-suggestion">
            <Text variant="bodyStrong">
              {t('workout.switchTitle', { name: t(`exercises.names.${live.suggestion}`) })}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Button
                label={t('workout.switchAction')}
                onPress={() => onSwitch(live.suggestion!)}
              />
              <Button
                label={t('workout.keep')}
                variant="secondary"
                onPress={live.dismissSuggestion}
              />
            </View>
          </Card>
        ) : (
          <FormBanner
            messageKey={live.lastCue?.key ?? null}
            severity={live.lastCue?.severity ?? 'info'}
          />
        )
      }
      center={
        target !== null ? (
          <TimerRing
            label={isHold ? t('workout.holdTime') : undefined}
            elapsedMs={isHold ? heldMs : elapsed}
            targetMs={target * 1000}
            sub={!isHold && reps > 0 ? t('workout.reps', { count: reps }) : undefined}
          />
        ) : (
          <RepRing reps={reps} target={step.targetReps} />
        )
      }
      hint={free && !live.active ? t('workout.detecting') : stepTarget(step, lt) || info?.name}
      onAdjust={target === null ? adjust : undefined}
      onFinish={complete}
    />
  );
}

function ManualSet({ step, info, paused, elapsedMs, coach, onComplete }: ActiveSetProps) {
  const { t } = useTranslation();
  const lt = useLooseT();
  const now = useTicker(!paused);
  const [reps, setReps] = useState(0);
  const elapsed = elapsedMs(now);
  const target = step.targetSeconds;

  const count = (d: number) => {
    if (paused) return;
    const next = Math.max(0, reps + d);
    setReps(next);
    if (d > 0) {
      haptics.rep();
      coach.handleEngineEvents(
        [
          {
            type: 'rep',
            t: Date.now(),
            reps: next,
            quality: 100,
            durationMs: 2000,
            tooFast: false,
            violations: [],
          },
        ],
        { targetReps: step.targetReps, avgRepMs: null },
      );
    } else haptics.tap();
  };

  const complete = useCallback(
    () =>
      onComplete({
        reps,
        heldSeconds: target !== null ? Math.round(elapsedMs(Date.now()) / 1000) : null,
        avgQuality: null,
        formFlags: [],
        manualAdjustment: reps,
        cameraTracked: false,
      }),
    [onComplete, reps, target, elapsedMs],
  );
  const done =
    target !== null
      ? elapsed >= target * 1000
      : step.targetReps !== null && reps >= step.targetReps;
  useAutoComplete(done, complete, paused);

  return (
    <SetLayout
      banner={null}
      center={
        target !== null ? (
          <TimerRing elapsedMs={elapsed} targetMs={target * 1000} />
        ) : (
          <PressableScale
            testID="rep-tap"
            haptic={null}
            accessibilityLabel={t('workout.addRep')}
            onPress={() => count(1)}
          >
            <RepRing reps={reps} target={step.targetReps} />
          </PressableScale>
        )
      }
      hint={
        target !== null
          ? info?.tracked
            ? stepTarget(step, lt)
            : t('workout.notTracked')
          : t('workout.tapToCount')
      }
      onAdjust={target === null ? count : undefined}
      onFinish={complete}
    />
  );
}

function RepRing({ reps, target }: { reps: number; target: number | null }) {
  const { t } = useTranslation();
  const { ring } = usePlayerLayout();
  return (
    <ProgressRing progress={target ? reps / target : 0} size={ring} strokeWidth={14} gradient>
      <AnimatedCounter
        testID="rep-count"
        value={reps}
        accessibilityLabel={target ? `${reps} / ${target}` : t('workout.reps', { count: reps })}
      />
      {target ? (
        <Text variant="h3" color="textMuted">
          / {target}
        </Text>
      ) : null}
    </ProgressRing>
  );
}

function TimerRing({
  elapsedMs,
  targetMs,
  label,
  sub,
}: {
  elapsedMs: number;
  targetMs: number;
  label?: string;
  sub?: string;
}) {
  const { ring } = usePlayerLayout();
  const remaining = Math.max(0, targetMs - elapsedMs);
  return (
    <ProgressRing
      progress={Math.min(1, elapsedMs / targetMs)}
      size={ring}
      strokeWidth={14}
      gradient
      accessibilityLabel={formatClock(remaining)}
    >
      {label ? (
        <Text variant="overline" color="textMuted">
          {label}
        </Text>
      ) : null}
      <Text variant="timer" testID="set-timer" style={{ fontVariant: ['tabular-nums'] }}>
        {formatClock(remaining)}
      </Text>
      {sub ? (
        <Text variant="h3" color="textMuted">
          {sub}
        </Text>
      ) : null}
    </ProgressRing>
  );
}

function SetLayout({
  banner,
  center,
  hint,
  onAdjust,
  onFinish,
}: {
  banner: React.ReactNode;
  center: React.ReactNode;
  hint?: string;
  onAdjust?: (delta: number) => void;
  onFinish: () => void;
}) {
  const { t } = useTranslation();
  const { spacing, colors, hitTarget, radii } = useTheme();
  const round = {
    width: hitTarget + 8,
    height: hitTarget + 8,
    borderRadius: radii.pill,
    backgroundColor: colors.overlay,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };
  const { landscape } = usePlayerLayout();
  const counter = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
      {onAdjust ? (
        <PressableScale
          testID="rep-minus"
          accessibilityLabel={t('workout.removeRep')}
          onPress={() => onAdjust(-1)}
          style={round}
        >
          <Icon name="remove" />
        </PressableScale>
      ) : null}
      {center}
      {onAdjust ? (
        <PressableScale
          testID="rep-plus"
          accessibilityLabel={t('workout.addRep')}
          onPress={() => onAdjust(1)}
          style={round}
        >
          <Icon name="add" />
        </PressableScale>
      ) : null}
    </View>
  );
  const hintText = hint ? (
    <Text variant="body" color="textMuted" align="center">
      {hint}
    </Text>
  ) : null;
  const finish = (
    <Button
      testID="finish-set"
      label={t('workout.doneSet')}
      icon="checkmark"
      size="lg"
      fullWidth
      onPress={onFinish}
    />
  );
  if (landscape) {
    return (
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
        <View style={{ flex: 1, gap: spacing[3] }}>
          {banner}
          {hintText}
        </View>
        {counter}
        <View style={{ flex: 1, justifyContent: 'flex-end' }}>{finish}</View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, justifyContent: 'space-between', gap: spacing[4] }}>
      <View style={{ minHeight: 64 }}>{banner}</View>
      <View style={{ alignItems: 'center', gap: spacing[4] }}>
        {counter}
        {hintText}
      </View>
      {finish}
    </View>
  );
}
