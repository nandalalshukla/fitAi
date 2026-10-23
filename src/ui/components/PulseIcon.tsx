import { useEffect } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useMotion } from '../hooks/useMotion';
import type { ColorTokens } from '../theme/colors';
import { Icon, type IconName } from './Icon';

export interface PulseIconProps {
  name: IconName;
  color?: keyof ColorTokens;
  size?: Parameters<typeof Icon>[0]['size'];
  /** Animate only when true (e.g. an active streak). */
  active?: boolean;
}

/** Gently "breathing" icon (streak flame). Static under Reduce Motion. */
export function PulseIcon({ name, color, size, active = true }: PulseIconProps) {
  const { reduceMotion } = useMotion();
  const scale = useSharedValue(1);
  useEffect(() => {
    if (!active || reduceMotion) {
      scale.set(1);
      return;
    }
    scale.set(
      withRepeat(
        withSequence(withTiming(1.15, { duration: 700 }), withTiming(1, { duration: 700 })),
        -1,
      ),
    );
  }, [active, reduceMotion, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Animated.View style={style}>
      <Icon name={name} color={color} size={size} />
    </Animated.View>
  );
}
