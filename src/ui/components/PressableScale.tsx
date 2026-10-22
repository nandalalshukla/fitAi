import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptics, type HapticKind } from '../haptics';
import { spring } from '../hooks/useMotion';
import { pressScale } from '../theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed. Defaults to the `pressScale` motion token. */
  scaleTo?: number;
  /** Haptic fired on press. `null` disables it. */
  haptic?: HapticKind | null;
}

/**
 * Base for every tappable element: spring scale on the UI thread + haptic.
 * Under Reduce Motion the spring resolves instantly (ReduceMotion.System).
 */
export function PressableScale({
  children,
  style,
  scaleTo = pressScale,
  haptic = 'press',
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  accessibilityRole = 'button',
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: Boolean(disabled), ...rest.accessibilityState }}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, spring('snappy')));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, spring('snappy')));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) haptics[haptic]();
        onPress?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}
