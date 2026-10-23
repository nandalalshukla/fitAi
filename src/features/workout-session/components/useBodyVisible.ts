import { useState } from 'react';
import { useAnimatedReaction, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { KEYPOINT_STRIDE } from '@/features/pose/domain/keypoints';
import type { Pose } from '@/features/pose/domain/types';

/** Shoulder, hip, knee and ankle pairs: one side of each must be visible (side views hide the other). */
const FRAMING: readonly (readonly [number, number])[] = [
  [5, 6],
  [11, 12],
  [13, 14],
  [15, 16],
];
const MIN_SCORE = 0.5;

/**
 * Positioning check for the get-ready screen: true when shoulders, hips, knees
 * and ankles are confidently detected. Evaluated on the UI
 * thread; React only re-renders when the answer flips.
 */
export function useBodyVisible(pose: SharedValue<Pose | null> | null): boolean | null {
  const [visible, setVisible] = useState<boolean | null>(null);
  useAnimatedReaction(
    () => {
      const p = pose?.get();
      if (!p) return null;
      const seen = (k: number) => (p.points[k * KEYPOINT_STRIDE + 2] ?? 0) >= MIN_SCORE;
      for (const [l, r] of FRAMING) if (!seen(l) && !seen(r)) return false;
      return true;
    },
    (v, prev) => {
      if (v !== prev) scheduleOnRN(setVisible, v);
    },
    [pose],
  );
  return visible;
}
