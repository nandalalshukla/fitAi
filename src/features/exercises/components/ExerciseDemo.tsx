import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { KP, SKELETON_EDGES } from '@/features/pose/domain/keypoints';
import { Text, useMotion, useTheme } from '@/ui';

import { getAnimation } from '../animation';
import { project } from '../animation/body3d';
import { bodyAt, stepAt } from '../animation/interpolate';
import type { ExerciseAnimation } from '../animation/keyframes/types';
import { segmentsFor } from './demoAnnotations';

export interface DemoAnnotation {
  /** Canonical keypoint index the label follows. */
  keypoint: number;
  label: string;
}

export interface ExerciseDemoProps {
  /** Catalog exercise id (must have an animation, see `hasDemo`). */
  exercise: string;
  width: number;
  height: number;
  playing?: boolean;
  /** 0.5 or 1. */
  speed?: number;
  /** Camera yaw override: 90 side, 0 front. Defaults to the animation's preferred view. */
  yawDeg?: number;
  /** Translucent "ghost" rendering (target pose next to the live skeleton). */
  ghost?: boolean;
  /** Hold the figure at this loop time (step-synced mode / Reduce Motion), instead of playing. */
  holdAt?: number | null;
  /** Called when the instruction step shown by the animation changes. */
  onStep?: (step: number) => void;
  /** Muscle groups to highlight on the figure. */
  highlight?: readonly string[];
  /** Short cue labels attached to joints. */
  annotations?: readonly DemoAnnotation[];
  accessibilityLabel?: string;
}

interface Fit {
  scale: number;
  dx: number;
  dy: number;
}

/** Fits every frame of the loop into the canvas (computed once per exercise/view/size). */
function computeFit(anim: ExerciseAnimation, yaw: number, w: number, h: number): Fit {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i <= 24; i++) {
    const p = project(bodyAt(anim, i / 24), { yawDeg: yaw });
    for (let k = 0; k < p.x.length; k++) {
      minX = Math.min(minX, p.x[k]!);
      maxX = Math.max(maxX, p.x[k]!);
      minY = Math.min(minY, p.y[k]!);
      maxY = Math.max(maxY, p.y[k]!);
    }
  }
  const pad = 0.12;
  const scale = Math.min(
    (w * (1 - 2 * pad)) / (maxX - minX || 1),
    (h * (1 - 2 * pad)) / (maxY - minY || 1),
  );
  return {
    scale,
    dx: w / 2 - ((minX + maxX) / 2) * scale,
    dy: h / 2 - ((minY + maxY) / 2) * scale,
  };
}

/**
 * Original, procedurally animated stick figure built from the exercise's
 * keyframes (the same data used by the ghost overlay and the engine tests).
 * Runs on the UI thread. Under Reduce Motion it never loops: it shows the held
 * step (or the peak position) so instructions can be stepped through instead.
 */
export function ExerciseDemo({
  exercise,
  width,
  height,
  playing = true,
  speed = 1,
  yawDeg,
  ghost = false,
  holdAt = null,
  onStep,
  highlight = [],
  annotations = [],
  accessibilityLabel,
}: ExerciseDemoProps) {
  const { colors } = useTheme();
  const { reduceMotion } = useMotion();
  const anim = getAnimation(exercise)!;
  const yaw = yawDeg ?? anim.yawDeg;
  const fit = useMemo(() => computeFit(anim, yaw, width, height), [anim, yaw, width, height]);
  const segments = useMemo(() => segmentsFor(highlight), [highlight]);
  const t = useSharedValue(reduceMotion ? anim.peakT : 0);

  useEffect(() => {
    if (holdAt !== null) {
      cancelAnimation(t);
      t.set(reduceMotion ? holdAt : withTiming(holdAt, { duration: 350 }));
      return;
    }
    if (!playing || reduceMotion) {
      cancelAnimation(t);
      if (reduceMotion) t.set(anim.peakT);
      return;
    }
    const start = t.get() % 1;
    const duration = anim.durationMs / speed;
    t.set(
      withTiming(1, { duration: (1 - start) * duration, easing: Easing.linear }, (done) => {
        if (done) {
          t.set(0);
          t.set(withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false));
        }
      }),
    );
    return () => cancelAnimation(t);
  }, [playing, reduceMotion, speed, anim, t, holdAt]);

  useAnimatedReaction(
    () => stepAt(anim, t.get()),
    (step, prev) => {
      if (onStep && step !== prev) scheduleOnRN(onStep, step);
    },
    [anim, onStep],
  );

  const projected = useDerivedValue(() => {
    const p = project(bodyAt(anim, t.get()), { yawDeg: yaw });
    return {
      x: p.x.map((v) => v * fit.scale + fit.dx),
      y: p.y.map((v) => v * fit.scale + fit.dy),
      depth: p.depth,
    };
  });

  const paths = useDerivedValue(() => {
    const { x, y, depth } = projected.get();
    const near = Skia.PathBuilder.Make();
    const far = Skia.PathBuilder.Make();
    for (const [a, b] of SKELETON_EDGES) {
      // Draw limbs further from the camera dimmer, for depth in side views.
      const target = (depth[a] ?? 0) + (depth[b] ?? 0) < 0 ? far : near;
      target.moveTo(x[a] ?? 0, y[a] ?? 0).lineTo(x[b] ?? 0, y[b] ?? 0);
    }
    const hot = Skia.PathBuilder.Make();
    for (const [a, b] of segments) hot.moveTo(x[a] ?? 0, y[a] ?? 0).lineTo(x[b] ?? 0, y[b] ?? 0);
    const head = Skia.PathBuilder.Make();
    head.addCircle(x[KP.nose] ?? 0, y[KP.nose] ?? 0, fit.scale * 0.17);
    return { near: near.build(), far: far.build(), hot: hot.build(), head: head.build() };
  });
  const near = useDerivedValue(() => paths.get().near);
  const far = useDerivedValue(() => paths.get().far);
  const hot = useDerivedValue(() => paths.get().hot);
  const head = useDerivedValue(() => paths.get().head);
  const stroke = Math.max(4, fit.scale * 0.11);
  const main = ghost ? colors.text : colors.accent;

  return (
    <View
      style={{ width, height }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Canvas style={{ width, height }}>
        <Path
          path={far}
          style="stroke"
          strokeWidth={stroke}
          strokeCap="round"
          color={main}
          opacity={ghost ? 0.2 : 0.45}
        />
        <Path
          path={near}
          style="stroke"
          strokeWidth={stroke}
          strokeCap="round"
          color={main}
          opacity={ghost ? 0.45 : 1}
        />
        {segments.length > 0 && !ghost ? (
          <Path
            path={hot}
            style="stroke"
            strokeWidth={stroke * 1.6}
            strokeCap="round"
            color={colors.ember}
            opacity={0.85}
          />
        ) : null}
        <Path path={head} style="fill" color={main} opacity={ghost ? 0.45 : 1} />
      </Canvas>
      {annotations.map((a) => (
        <JointLabel
          key={`${a.keypoint}-${a.label}`}
          projected={projected}
          keypoint={a.keypoint}
          label={a.label}
        />
      ))}
    </View>
  );
}

/** A small cue label that follows one joint of the figure. */
function JointLabel({
  projected,
  keypoint,
  label,
}: {
  projected: SharedValue<{ x: number[]; y: number[]; depth: number[] }>;
  keypoint: number;
  label: string;
}) {
  const { colors, radii, spacing } = useTheme();
  const style = useAnimatedStyle(() => {
    const p = projected.get();
    return {
      transform: [
        { translateX: (p.x[keypoint] ?? 0) + 10 },
        { translateY: (p.y[keypoint] ?? 0) - 12 },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no"
      accessibilityElementsHidden
      style={[
        styles.label,
        {
          backgroundColor: colors.surfaceElevated,
          borderColor: colors.ember,
          borderRadius: radii.sm,
          paddingHorizontal: spacing[1],
        },
        style,
      ]}
    >
      <Text variant="caption" numberOfLines={1} style={{ fontSize: 11 }}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  label: { position: 'absolute', left: 0, top: 0, borderWidth: 1, maxWidth: 140 },
});

export const hasDemo = (id: string): boolean => getAnimation(id) !== undefined;

/** Loop time of the first keyframe illustrating `step` (for step-synced holds). */
export function stepTime(exercise: string, step: number): number | null {
  const anim = getAnimation(exercise);
  const k = anim?.keyframes.find((f) => f.step === step);
  return k ? k.t : null;
}
