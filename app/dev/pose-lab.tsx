import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useAnimatedReaction, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { isEnabled, logger } from '@/core';
import { allExercises, ExerciseHud, usePoseRecorder, type ExerciseId } from '@/features/exercises';
import {
  DEFAULT_POSE_MODEL,
  POSE_MODELS,
  PoseCameraView,
  PoseDebugOverlay,
  availableModels,
  summarizeBenchmark,
  type BenchmarkSummary,
  type EstimatorStatus,
  type PerfStats,
  type Pose,
  type PoseModelId,
} from '@/features/pose';
import { useTranslation } from '@/i18n';
import { Button, Card, Chip, Icon, PressableScale, Text, useTheme } from '@/ui';

const BENCHMARK_SECONDS = 30;

/**
 * Dev-only spike screen: camera + on-device pose model + Skia skeleton, with a
 * live perf HUD and a 30 s benchmark that summarizes FPS / latency for docs.
 */
export default function PoseLabScreen() {
  const { t } = useTranslation();
  const { colors, spacing, radii, hitTarget } = useTheme();
  const insets = useSafeAreaInsets();
  const models = availableModels();
  const [modelId, setModelId] = useState<PoseModelId>(DEFAULT_POSE_MODEL);
  const [position, setPosition] = useState<'front' | 'back'>('front');
  const [skeleton, setSkeleton] = useState(true);
  const [running, setRunning] = useState<number | null>(null);
  const [result, setResult] = useState<BenchmarkSummary | null>(null);
  const [exercise, setExercise] = useState<ExerciseId | 'auto' | 'off'>('off');
  const samples = useRef<PerfStats[]>([]);

  if (!isEnabled('devTools')) return <Redirect href="/" />;

  const startBenchmark = () => {
    samples.current = [];
    setResult(null);
    setRunning(BENCHMARK_SECONDS);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1 }}>
        <PoseCameraView
          key={`${modelId}-${position}`}
          modelId={modelId}
          position={position}
          showSkeleton={skeleton}
        >
          {({ pose, stats, status }) => (
            <>
              <PoseDebugOverlay
                pose={pose}
                stats={stats}
                label={`${POSE_MODELS[modelId].label} · ${statusLabel(status)}`}
              />
              {exercise !== 'off' ? (
                <ExerciseHud key={exercise} pose={pose} mode={exercise} difficulty="intermediate" />
              ) : null}
              <RecorderControl
                pose={pose}
                exercise={exercise === 'off' || exercise === 'auto' ? 'squat' : exercise}
              />
              {running !== null ? (
                <BenchmarkRecorder
                  stats={stats}
                  seconds={running}
                  onSample={(s) => samples.current.push(s)}
                  onTick={setRunning}
                  onDone={() => {
                    const summary = summarizeBenchmark(samples.current, BENCHMARK_SECONDS);
                    logger.info('Pose benchmark', {
                      modelId,
                      position,
                      delegate: statusLabel(status),
                      ...summary,
                    });
                    setResult(summary);
                    setRunning(null);
                  }}
                />
              ) : null}
            </>
          )}
        </PoseCameraView>
        <PressableScale
          accessibilityLabel={t('common.close')}
          onPress={() => router.back()}
          style={[
            styles.close,
            {
              top: insets.top + spacing[2],
              width: hitTarget,
              height: hitTarget,
              borderRadius: radii.pill,
              backgroundColor: colors.overlay,
            },
          ]}
        >
          <Icon name="close" />
        </PressableScale>
      </View>

      <ScrollView
        style={{ maxHeight: 300 }}
        contentContainerStyle={{
          padding: spacing[4],
          paddingBottom: insets.bottom + spacing[4],
          gap: spacing[3],
        }}
      >
        <Text variant="overline" color="textMuted">
          {t('poseLab.model')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
          {models.map((id) => (
            <Chip
              key={id}
              label={POSE_MODELS[id].label}
              selected={id === modelId}
              onPress={() => setModelId(id)}
            />
          ))}
          <Chip
            label={t('camera.skeleton')}
            selected={skeleton}
            onPress={() => setSkeleton((v) => !v)}
          />
        </View>
        <Text variant="overline" color="textMuted">
          {t('poseLab.exercise')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
          <Chip
            label={t('poseLab.off')}
            selected={exercise === 'off'}
            onPress={() => setExercise('off')}
          />
          <Chip
            label={t('poseLab.auto')}
            selected={exercise === 'auto'}
            onPress={() => setExercise('auto')}
          />
          {allExercises().map((d) => (
            <Chip
              key={d.id}
              label={t(`exercises.names.${d.id}`)}
              selected={exercise === d.id}
              onPress={() => setExercise(d.id)}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          <Button
            label={t('camera.flip')}
            icon="camera-reverse-outline"
            variant="secondary"
            onPress={() => setPosition((p) => (p === 'front' ? 'back' : 'front'))}
          />
          <Button
            label={
              running !== null
                ? t('poseLab.benchmarking', { seconds: running })
                : t('poseLab.benchmark')
            }
            icon="speedometer-outline"
            disabled={running !== null}
            onPress={startBenchmark}
          />
        </View>
        {result ? (
          <Card>
            <Text variant="h3">{t('poseLab.results')}</Text>
            <Text variant="caption" color="textMuted" style={{ fontVariant: ['tabular-nums'] }}>
              {`${POSE_MODELS[modelId].label} · ${position}\n` +
                `camera fps p50 ${result.cameraFps.p50} · p5 ${result.cameraFps.p5}\n` +
                `pose fps p50 ${result.poseFps.p50} · p5 ${result.poseFps.p5}\n` +
                `inference ms p50 ${result.inferenceMs.p50} · p95 ${result.inferenceMs.p95} · max ${result.inferenceMs.max}\n` +
                `max stride ${result.maxStride} · samples ${result.samples}`}
            </Text>
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

/** Floating Record / Stop button: saves the pose stream as a replay fixture and opens the share sheet. */
function RecorderControl({
  pose,
  exercise,
}: {
  pose: SharedValue<Pose | null>;
  exercise: ExerciseId;
}) {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const recorder = usePoseRecorder(pose);
  return (
    <View style={{ position: 'absolute', left: spacing[2], bottom: spacing[2] }}>
      <Button
        label={recorder.recording ? t('poseLab.stopRecording') : t('poseLab.record')}
        icon={recorder.recording ? 'stop' : 'radio-button-on'}
        variant={recorder.recording ? 'danger' : 'secondary'}
        onPress={() =>
          recorder.recording ? void recorder.stop(exercise, 'intermediate') : recorder.start()
        }
      />
    </View>
  );
}

function statusLabel(status: EstimatorStatus): string {
  if (status.state === 'ready') return status.delegate.toUpperCase();
  return status.state;
}

/** Collects stats snapshots (≈2 Hz) and counts down the benchmark. */
function BenchmarkRecorder({
  stats,
  seconds,
  onSample,
  onTick,
  onDone,
}: {
  stats: SharedValue<PerfStats | null>;
  seconds: number;
  onSample: (s: PerfStats) => void;
  onTick: (s: number) => void;
  onDone: () => void;
}) {
  useAnimatedReaction(
    () => stats.get(),
    (s, prev) => {
      if (s !== null && s !== prev) scheduleOnRN(onSample, s);
    },
  );
  useEffect(() => {
    const id = setTimeout(() => (seconds <= 1 ? onDone() : onTick(seconds - 1)), 1000);
    return () => clearTimeout(id);
  }, [seconds, onDone, onTick]);
  return null;
}

const styles = StyleSheet.create({
  close: { position: 'absolute', right: 12, alignItems: 'center', justifyContent: 'center' },
});
