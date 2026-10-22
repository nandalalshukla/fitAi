import { useEffect, useRef } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { spring, timing } from '../hooks/useMotion';
import type { ColorTokens } from '../theme/colors';
import type { TypographyVariant } from '../theme/typography';
import { Text } from './Text';

export interface AnimatedCounterProps {
  value: number;
  variant?: Extract<TypographyVariant, 'counter' | 'timer' | 'displayL' | 'displayM' | 'h1'>;
  color?: keyof ColorTokens;
  accessibilityLabel?: string;
  testID?: string;
}

/**
 * Big tabular number with a spring "pop" whenever it increases (rep counter).
 * Animation runs on the UI thread; under Reduce Motion it is skipped.
 */
export function AnimatedCounter({
  value,
  variant = 'counter',
  color = 'text',
  accessibilityLabel,
  testID,
}: AnimatedCounterProps) {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);
  const previous = useRef(value);

  useEffect(() => {
    if (value > previous.current) {
      scale.set(withSequence(withTiming(1.18, timing('fast')), withSpring(1, spring('bouncy'))));
      translateY.set(withSequence(withTiming(-6, timing('fast')), withSpring(0, spring('bouncy'))));
    }
    previous.current = value;
  }, [value, scale, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }, { scale: scale.get() }],
  }));

  return (
    <Animated.View style={style}>
      <Text
        testID={testID}
        variant={variant}
        color={color}
        align="center"
        accessibilityLabel={accessibilityLabel}
        accessibilityLiveRegion="polite"
      >
        {value}
      </Text>
    </Animated.View>
  );
}
