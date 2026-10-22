import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { useTheme } from '@/ui';

import { KEYPOINT_COUNT, KEYPOINT_STRIDE, SKELETON_EDGES } from '../domain/keypoints';
import type { Pose } from '../domain/types';
import { computeViewTransform, toView } from '../domain/viewTransform';

/** 0 = good form, 1 = warning, 2 = bad. Drives the skeleton colour. */
export type FormLevel = 0 | 1 | 2;

export interface SkeletonOverlayProps {
  pose: SharedValue<Pose | null>;
  formLevel?: SharedValue<FormLevel>;
  /** Must match the camera preview's resize mode. */
  resizeMode?: 'cover' | 'contain';
  /** Keypoints below this confidence are not drawn. */
  minScore?: number;
  /** Debug: flip horizontally (for calibrating mirrored front-camera setups). */
  flipX?: boolean;
}

/**
 * Draws bones + joints over the camera preview with Skia. Paths are rebuilt on
 * the UI thread from a shared value, so new poses never trigger React renders.
 */
export function SkeletonOverlay({
  pose,
  formLevel,
  resizeMode = 'cover',
  minScore = 0.5,
  flipX = false,
}: SkeletonOverlayProps) {
  const { colors } = useTheme();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const palette = [colors.poseGood, colors.poseWarn, colors.poseBad];
  const viewW = size.width;
  const viewH = size.height;

  const paths = useDerivedValue(() => {
    const bones = Skia.PathBuilder.Make();
    const joints = Skia.PathBuilder.Make();
    const p = pose.get();
    if (p !== null && viewW > 0) {
      const t = computeViewTransform(p.frameWidth, p.frameHeight, viewW, viewH, resizeMode);
      const pt = (k: number): [number, number] | null => {
        const i = k * KEYPOINT_STRIDE;
        if ((p.points[i + 2] ?? 0) < minScore) return null;
        const v = toView(p.points[i] ?? 0, p.points[i + 1] ?? 0, t);
        return flipX ? [viewW - v[0], v[1]] : v;
      };
      for (const [a, b] of SKELETON_EDGES) {
        const pa = pt(a);
        const pb = pt(b);
        if (pa && pb) bones.moveTo(pa[0], pa[1]).lineTo(pb[0], pb[1]);
      }
      for (let k = 0; k < KEYPOINT_COUNT; k++) {
        const v = pt(k);
        if (v) joints.addCircle(v[0], v[1], 6);
      }
    }
    return { bones: bones.build(), joints: joints.build() };
  });

  const bones = useDerivedValue(() => paths.get().bones);
  const joints = useDerivedValue(() => paths.get().joints);
  const color = useDerivedValue(() => palette[formLevel?.get() ?? 0] ?? palette[0]!);

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e: LayoutChangeEvent) =>
        setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
      }
    >
      <Canvas style={StyleSheet.absoluteFill}>
        <Path
          path={bones}
          style="stroke"
          strokeWidth={5}
          strokeCap="round"
          color={color}
          opacity={0.9}
        />
        <Path path={joints} style="fill" color={colors.text} />
      </Canvas>
    </View>
  );
}
