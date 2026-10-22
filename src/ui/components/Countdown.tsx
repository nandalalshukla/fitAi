import { useEffect, useState } from 'react';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';

import { haptics } from '../haptics';
import { bezier, useMotion } from '../hooks/useMotion';
import { durations } from '../theme/motion';
import { Text } from './Text';

export interface CountdownProps {
  from?: number;
  onTick?: (n: number) => void;
  onDone: () => void;
  /** Interval per number in ms. */
  intervalMs?: number;
}

/** 3-2-1 countdown with scale/fade per number (fade only under Reduce Motion). */
export function Countdown({ from = 3, onTick, onDone, intervalMs = 1000 }: CountdownProps) {
  const [n, setN] = useState(from);
  const { reduceMotion, enterFade, exitFade } = useMotion();

  useEffect(() => {
    onTick?.(n);
    haptics.tap();
    const id = setTimeout(() => {
      if (n <= 1) onDone();
      else setN(n - 1);
    }, intervalMs);
    return () => clearTimeout(id);
    // onTick/onDone are intentionally excluded so parent re-renders don't restart the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n, intervalMs]);

  return (
    <Animated.View
      key={n}
      entering={
        reduceMotion ? enterFade : ZoomIn.duration(durations.slow).easing(bezier('emphasized'))
      }
      exiting={reduceMotion ? exitFade : ZoomOut.duration(durations.fast)}
    >
      <Text variant="counter" color="accentText" align="center" accessibilityLiveRegion="assertive">
        {n}
      </Text>
    </Animated.View>
  );
}
