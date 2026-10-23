import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import {
  cancelAnimation,
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { KP, SKELETON_EDGES } from '@/features/pose/domain/keypoints';
import { useMotion, useTheme } from '@/ui';

import { project } from '../animation/body3d';
import { getAnimation } from '../animation';
import { bodyAt } from '../animation/interpolate';
import type { ExerciseAnimation } from '../animation/keyframes/types';

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
 * Runs on the UI thread; under Reduce Motion it shows the static peak position.
 */
export function ExerciseDemo({
  exercise,
  width,
  height,
  playing = true,
  speed = 1,
  yawDeg,
  ghost = false,
  accessibilityLabel,
}: ExerciseDemoProps) {
  const { colors } = useTheme();
  const { reduceMotion } = useMotion();
  const anim = getAnimation(exercise)!;
  const yaw = yawDeg ?? anim.yawDeg;
  const fit = useMemo(() => computeFit(anim, yaw, width, height), [anim, yaw, width, height]);
  const t = useSharedValue(reduceMotion ? anim.peakT : 0);

  useEffect(() => {
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
  }, [playing, reduceMotion, speed, anim, t]);

  const paths = useDerivedValue(() => {
    const p = project(bodyAt(anim, t.get()), { yawDeg: yaw });
    const sx = (k: number) => (p.x[k] ?? 0) * fit.scale + fit.dx;
    const sy = (k: number) => (p.y[k] ?? 0) * fit.scale + fit.dy;
    const near = Skia.PathBuilder.Make();
    const far = Skia.PathBuilder.Make();
    for (const [a, b] of SKELETON_EDGES) {
      // Draw limbs further from the camera dimmer, for depth in side views.
      const target = (p.depth[a] ?? 0) + (p.depth[b] ?? 0) < 0 ? far : near;
      target.moveTo(sx(a), sy(a)).lineTo(sx(b), sy(b));
    }
    const head = Skia.PathBuilder.Make();
    head.addCircle(sx(KP.nose), sy(KP.nose), fit.scale * 0.17);
    return { near: near.build(), far: far.build(), head: head.build() };
  });
  const near = useDerivedValue(() => paths.get().near);
  const far = useDerivedValue(() => paths.get().far);
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
        <Path path={head} style="fill" color={main} opacity={ghost ? 0.45 : 1} />
      </Canvas>
    </View>
  );
}

export const hasDemo = (id: string): boolean => getAnimation(id) !== undefined;
