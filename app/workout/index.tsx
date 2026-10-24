import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getExerciseInfo } from '@/content';
import { track } from '@/core';
import { ExerciseDemo, hasDemo, type ExerciseId, type LiveFormLevel } from '@/features/exercises';
import {
  DEFAULT_POSE_MODEL,
  HIGH_ACCURACY_POSE_MODEL,
  PoseCameraView,
  isModelAvailable,
  type Pose,
} from '@/features/pose';
import { useWorkoutPrefs } from '@/features/settings/workoutPrefsStore';
import { useVoiceCoach } from '@/features/voice';
import {
  activeElapsedMs,
  currentStep,
  restRemainingMs,
  sessionProgress,
  useWorkoutSession,
  type PlayerState,
} from '@/features/workout-session';
import { ActiveSet, type SetOutcome } from '@/features/workout-session/components/ActiveSet';
import { GetReady } from '@/features/workout-session/components/GetReady';
import { CameraScrim } from '@/features/workout-session/components/CameraScrim';
import { RestView } from '@/features/workout-session/components/RestView';
import { SetCompleteBurst } from '@/features/workout-session/components/SetCompleteBurst';
import { useTicker } from '@/features/workout-session/components/useTicker';
import { useTranslation } from '@/i18n';
import {
  Button,
  Countdown,
  ErrorState,
  Icon,
  Modal,
  PressableScale,
  Skeleton,
  Text,
  haptics,
  useTheme,
  useToast,
} from '@/ui';

const REST_EXTENSION_S = 15;

/**
 * Workout player: get ready (positioning check) → 3-2-1 → set (camera coach or
 * manual) → rest → … → summary. Hands-free first: big numbers, voice cues and
 * automatic set completion; pause, manual +/-, skip and save-for-later on hand.
 */
export default function WorkoutScreen() {
  useKeepAwake();
  // Floor exercises are filmed with the phone sideways: the player may rotate.
  useEffect(() => {
    void ScreenOrientation.unlockAsync();
    return () => void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);
  const params = useLocalSearchParams<{ mode?: string; day?: string; resume?: string }>();
  const [workoutParams] = useState(() => ({
    mode: params.mode === 'free' ? ('free' as const) : ('plan' as const),
    day: params.day ? Number(params.day) : undefined,
    resumeId: params.resume,
  }));
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const coach = useVoiceCoach();
  const prefs = useWorkoutPrefs();
  const { state, error, level, planId, finishedId, dispatch } = useWorkoutSession(workoutParams);
  const [cameraOn, setCameraOn] = useState(prefs.useCamera);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [detected, setDetected] = useState<ExerciseId | null>(null);
  const formLevel = useSharedValue<LiveFormLevel>(0);

  // Leave when the finished session is saved.
  useEffect(() => {
    if (finishedId === null) return;
    if (finishedId) router.replace({ pathname: '/workout/summary', params: { id: finishedId } });
    else {
      toast.show({ message: t('summary.nothingRecorded'), kind: 'info' });
      router.back();
    }
  }, [finishedId, t, toast]);

  // Interruptions (calls, app switch): pause so timers and counting stop.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') dispatch({ type: 'pause', now: Date.now() });
    });
    return () => sub.remove();
  }, [dispatch]);

  useVoiceTransitions(state, coach);

  // Rest timer.
  const resting = state?.phase === 'rest' && !state.paused;
  const now = useTicker(resting, 200);
  useEffect(() => {
    if (resting) dispatch({ type: 'tick', now });
  }, [resting, now, dispatch]);

  const modelId =
    prefs.modelAccuracy === 'high' && isModelAvailable(HIGH_ACCURACY_POSE_MODEL)
      ? HIGH_ACCURACY_POSE_MODEL
      : DEFAULT_POSE_MODEL;

  const started = useRef(false);
  const begin = () => {
    if (!started.current && state) {
      started.current = true;
      track('workout_started', {
        mode: state.free ? 'free' : 'plan',
        plan: planId,
        camera: cameraOn,
        resumed: Boolean(workoutParams.resumeId),
      });
    }
    dispatch({ type: 'begin', now: Date.now() });
  };

  const onUnavailable = useCallback(
    (reason: 'permission' | 'model') => {
      track('camera_unavailable', { reason });
      setCameraOn(false);
      toast.show({ message: t('workout.notTracked'), kind: 'info' });
    },
    [t, toast],
  );

  const onComplete = useCallback(
    (o: SetOutcome) => {
      haptics.setComplete();
      setDetected(null);
      dispatch({ type: 'completeSet', now: Date.now(), result: o });
    },
    [dispatch],
  );

  const elapsed = useCallback((n: number) => (state ? activeElapsedMs(state, n) : 0), [state]);

  const pause = () => {
    dispatch({ type: 'pause', now: Date.now() });
    coach.pause();
    setConfirmEnd(true);
  };
  const resume = () => {
    setConfirmEnd(false);
    coach.resume();
    dispatch({ type: 'resume', now: Date.now() });
  };

  if (error) {
    return (
      <Shell>
        <ErrorState
          title={t('workout.loadFailed')}
          message={error === 'Rest day' ? t('workout.restDay') : error}
          retryLabel={t('common.close')}
          onRetry={() => router.back()}
        />
      </Shell>
    );
  }
  if (!state || finishedId !== null || state.phase === 'done') {
    return (
      <Shell>
        <View
          style={{ flex: 1, justifyContent: 'center', gap: spacing[3] }}
          testID="workout-loading"
        >
          <Skeleton height={28} width="50%" />
          <Skeleton height={260} radius="xl" />
          {state?.phase === 'done' ? (
            <Text variant="body" color="textMuted" align="center">
              {t('workout.finishing')}
            </Text>
          ) : null}
        </View>
      </Shell>
    );
  }

  const step = currentStep(state)!;
  const exerciseId = step.exerciseId ?? detected;
  const info = exerciseId ? getExerciseInfo(exerciseId) : undefined;

  const content = (pose: SharedValue<Pose | null> | null) => {
    switch (state.phase) {
      case 'ready':
        return <GetReady step={step} info={info} pose={pose} onStart={begin} />;
      case 'countdown':
        return (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {state.paused ? null : (
              <Countdown
                key={state.phaseStartedAt}
                onTick={(n) =>
                  coach.say({ id: 'countdown', textKey: 'voice.countdown', params: { count: n } })
                }
                onDone={() => {
                  coach.say({ id: 'go', textKey: 'voice.go' });
                  dispatch({ type: 'countdownDone', now: Date.now() });
                }}
              />
            )}
          </View>
        );
      case 'active':
        return (
          <>
            <ActiveSet
              key={step.index}
              step={step}
              info={info}
              pose={pose}
              formLevel={formLevel}
              level={level}
              free={state.free}
              paused={state.paused}
              elapsedMs={elapsed}
              coach={coach}
              onComplete={onComplete}
              onDetected={setDetected}
            />
            {pose && prefs.showGhost && exerciseId && hasDemo(exerciseId) ? (
              <View
                pointerEvents="none"
                style={[styles.ghost, { top: spacing[16], borderColor: colors.border }]}
              >
                <ExerciseDemo exercise={exerciseId} width={110} height={140} ghost />
              </View>
            ) : null}
          </>
        );
      case 'rest': {
        const prev = state.steps[state.index - 1];
        return (
          <RestView
            remainingMs={restRemainingMs(state, now)}
            totalMs={Math.max(1, (state.restEndsAt ?? 0) - state.phaseStartedAt)}
            next={step}
            onSkip={() => dispatch({ type: 'skipRest', now: Date.now() })}
            onExtend={() =>
              dispatch({ type: 'extendRest', now: Date.now(), seconds: REST_EXTENSION_S })
            }
            key={prev?.index ?? 0}
          />
        );
      }
      default:
        return null;
    }
  };

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
      <View style={{ flex: 1 }}>
        <Text variant="overline" color="textMuted" testID="set-indicator">
          {state.free
            ? t('workout.freeSet', { set: step.setNumber })
            : `${t(`workout.blocks.${step.blockKind}`)} · ${t('workout.setOf', { set: step.setNumber, total: step.setCount })}`}
        </Text>
        <Text variant="displayM" numberOfLines={1} testID="exercise-name">
          {info?.name ?? (state.free ? t('workout.freeTitle') : '')}
        </Text>
      </View>
      {state.phase === 'active' && !state.free ? (
        <RoundButton
          testID="skip-exercise"
          icon="play-skip-forward"
          label={t('workout.skipExercise')}
          onPress={() => dispatch({ type: 'skipExercise', now: Date.now() })}
        />
      ) : null}
      <RoundButton
        testID="toggle-camera"
        icon={cameraOn ? 'hand-left-outline' : 'videocam-outline'}
        label={cameraOn ? t('workout.manualMode') : t('workout.cameraMode')}
        onPress={() => setCameraOn((v) => !v)}
      />
      <RoundButton testID="pause-workout" icon="pause" label={t('workout.pause')} onPress={pause} />
    </View>
  );

  const progress = sessionProgress(state);

  return (
    <View testID="workout-screen" style={{ flex: 1, backgroundColor: colors.background }}>
      {cameraOn ? (
        <PoseCameraView
          modelId={modelId}
          position={prefs.cameraPosition}
          showSkeleton={prefs.showSkeleton}
          formLevel={formLevel}
          onUnavailable={onUnavailable}
        >
          {({ pose }) => (
            <View style={StyleSheet.absoluteFill}>
              <CameraScrim />
              <Body
                insetsTop={insets.top}
                insetsBottom={insets.bottom}
                header={header}
                progress={progress}
              >
                {content(pose)}
              </Body>
            </View>
          )}
        </PoseCameraView>
      ) : (
        <Body
          insetsTop={insets.top}
          insetsBottom={insets.bottom}
          header={header}
          progress={progress}
        >
          {content(null)}
        </Body>
      )}
      <SetCompleteBurst count={state.results.filter((r) => !r.skipped).length} />
      <Modal
        testID="pause-modal"
        visible={confirmEnd}
        onClose={resume}
        title={t('workout.paused')}
        message={t('workout.endConfirmMessage')}
        confirmLabel={t('workout.exit')}
        cancelLabel={t('workout.resume')}
        destructive
        onConfirm={() => {
          setConfirmEnd(false);
          coach.resume();
          dispatch({ type: 'finish', now: Date.now() });
        }}
      >
        <Button
          testID="save-for-later"
          label={t('workout.saveAndExit')}
          variant="ghost"
          onPress={() => {
            setConfirmEnd(false);
            coach.resume();
            router.back();
          }}
        />
      </Modal>
    </View>
  );
}

/** Speaks rest / next-exercise / finish cues on phase changes. */
function useVoiceTransitions(state: PlayerState | null, coach: ReturnType<typeof useVoiceCoach>) {
  const last = useRef<string>('');
  const endingSaid = useRef<number>(-1);
  useEffect(() => {
    if (!state) return;
    const key = `${state.phase}:${state.index}`;
    if (key === last.current) return;
    last.current = key;
    if (state.phase === 'rest' && state.restEndsAt !== null) {
      const seconds = Math.round((state.restEndsAt - state.phaseStartedAt) / 1000);
      coach.say({ id: 'rest_start', textKey: 'voice.restStart', params: { count: seconds } });
      const next = currentStep(state);
      const prev = state.steps[state.index - 1];
      const info = next?.exerciseId ? getExerciseInfo(next.exerciseId) : undefined;
      if (info && next?.exerciseId !== prev?.exerciseId)
        coach.say({
          id: 'next_exercise',
          textKey: 'voice.nextExercise',
          params: { name: info.name },
        });
    }
    if (state.phase === 'done')
      coach.say({ id: 'workout_complete', textKey: 'voice.workoutComplete' });
  }, [state, coach]);

  // "Get ready" near the end of the rest.
  const resting = state?.phase === 'rest' && !state.paused;
  const now = useTicker(resting, 500);
  useEffect(() => {
    if (!state || !resting) return;
    if (restRemainingMs(state, now) <= 3500 && endingSaid.current !== state.index) {
      endingSaid.current = state.index;
      coach.say({ id: 'rest_ending', textKey: 'voice.restEnding' });
    }
  }, [state, resting, now, coach]);
}

function Body({
  children,
  header,
  progress,
  insetsTop,
  insetsBottom,
}: {
  children: ReactNode;
  header: ReactNode;
  progress: number;
  insetsTop: number;
  insetsBottom: number;
}) {
  const { spacing, colors, radii } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        paddingTop: insetsTop + spacing[3],
        paddingBottom: insetsBottom + spacing[4],
        paddingHorizontal: spacing[5],
        gap: spacing[4],
      }}
    >
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
        style={{
          height: 4,
          borderRadius: radii.pill,
          backgroundColor: colors.border,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: 4,
            width: `${Math.round(progress * 100)}%`,
            backgroundColor: colors.accent,
          }}
        />
      </View>
      {header}
      {children}
    </View>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="workout-screen"
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + spacing[4],
        paddingBottom: insets.bottom + spacing[4],
        paddingHorizontal: spacing[5],
      }}
    >
      {children}
    </View>
  );
}

function RoundButton({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const { colors, hitTarget, radii } = useTheme();
  return (
    <PressableScale
      testID={testID}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        width: hitTarget,
        height: hitTarget,
        borderRadius: radii.pill,
        backgroundColor: colors.overlay,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={icon} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  ghost: { position: 'absolute', right: 0, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
});
