import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAnimatedReaction, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Text, useTheme } from '@/ui';

import { KEYPOINT_NAMES, KEYPOINT_STRIDE } from '../domain/keypoints';
import type { PerfStats } from '../domain/perf';
import type { Pose } from '../domain/types';

interface Snapshot {
  stats: PerfStats | null;
  scores: number[];
  poseScore: number;
}

/**
 * Dev-only overlay: FPS, inference time, throttle stride and keypoint confidences.
 * Updates at ~2 Hz (driven by the stats shared value) to stay cheap.
 */
export function PoseDebugOverlay({
  pose,
  stats,
  label,
}: {
  pose: SharedValue<Pose | null>;
  stats: SharedValue<PerfStats | null>;
  label: string;
}) {
  const { colors, radii, spacing } = useTheme();
  const [snap, setSnap] = useState<Snapshot>({ stats: null, scores: [], poseScore: 0 });

  useAnimatedReaction(
    () => stats.get(),
    (s, prev) => {
      if (s === prev) return;
      const p = pose.get();
      const scores: number[] = [];
      if (p)
        for (let i = 0; i < p.points.length; i += KEYPOINT_STRIDE)
          scores.push(p.points[i + 2] ?? 0);
      scheduleOnRN(setSnap, { stats: s, scores, poseScore: p?.score ?? 0 });
    },
  );

  const s = snap.stats;
  const line = (k: string, v: string) => (
    <Text variant="caption" style={styles.mono}>
      {k.padEnd(10)} {v}
    </Text>
  );

  return (
    <View
      pointerEvents="none"
      style={[
        styles.box,
        { backgroundColor: colors.overlay, borderRadius: radii.sm, padding: spacing[2] },
      ]}
    >
      <Text variant="overline" color="accentText">
        {label}
      </Text>
      {line('cam fps', s ? s.cameraFps.toFixed(1) : '-')}
      {line('pose fps', s ? s.inferenceFps.toFixed(1) : '-')}
      {line(
        'infer ms',
        s ? `${s.inferenceMs.toFixed(1)} (max ${s.maxInferenceMs.toFixed(0)})` : '-',
      )}
      {line('stride', s ? String(s.frameStride) : '-')}
      {line('pose', snap.poseScore.toFixed(2))}
      {snap.scores.map((v, i) => (
        <Text
          key={KEYPOINT_NAMES[i]}
          variant="caption"
          style={styles.mono}
          color={v < 0.5 ? 'dangerText' : 'textMuted'}
        >
          {(KEYPOINT_NAMES[i] ?? '').padEnd(16)} {v.toFixed(2)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', top: 8, left: 8, maxWidth: 240 },
  mono: { fontVariant: ['tabular-nums'], fontSize: 11, lineHeight: 14 },
});
