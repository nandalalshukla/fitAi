import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { useMotion } from '../hooks/useMotion';

/** Wrap list items to get the staggered entrance (fade-only under Reduce Motion). */
export function Stagger({
  index,
  children,
  style,
}: {
  index: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { enterStagger } = useMotion();
  return (
    <Animated.View entering={enterStagger(index)} style={style}>
      {children}
    </Animated.View>
  );
}
