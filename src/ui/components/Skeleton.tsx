import { useEffect } from 'react';
import { type DimensionValue } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useMotion } from '../hooks/useMotion';
import { durations } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';
import type { radii as radiiTokens } from '../theme/tokens';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: keyof typeof radiiTokens;
}

/** Pulsing placeholder used instead of spinners while content loads. */
export function Skeleton({ width = '100%', height = 16, radius = 'sm' }: SkeletonProps) {
  const { colors, radii } = useTheme();
  const { reduceMotion } = useMotion();
  const pulse = useSharedValue(0.55);

  useEffect(() => {
    if (reduceMotion) return;
    pulse.set(withRepeat(withTiming(1, { duration: durations.ambient / 2 }), -1, true));
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.get() }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radii[radius], backgroundColor: colors.skeletonHighlight },
        style,
      ]}
    />
  );
}
