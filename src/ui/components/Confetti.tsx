import { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useMotion } from '../hooks/useMotion';
import { useTheme } from '../theme/ThemeProvider';

export interface ConfettiProps {
  count?: number;
  /** Run duration of one burst, ms. */
  durationMs?: number;
}

interface Piece {
  x: number;
  drift: number;
  delay: number;
  spin: number;
  size: number;
  color: string;
}

/** Seeded so the burst is stable across re-renders (and deterministic in tests). */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Celebratory confetti burst on the UI thread. Decorative: hidden from screen
 * readers and not rendered at all under Reduce Motion.
 */
export function Confetti({ count = 28, durationMs = 2200 }: ConfettiProps) {
  const { colors } = useTheme();
  const { reduceMotion } = useMotion();
  const { width } = useWindowDimensions();
  const pieces = useMemo<Piece[]>(() => {
    const rnd = seeded(42);
    const palette = [colors.accent, colors.ember, colors.info, colors.success, colors.text];
    return Array.from({ length: count }, (_, i) => ({
      x: rnd() * width,
      drift: (rnd() - 0.5) * 120,
      delay: rnd() * 400,
      spin: (rnd() - 0.5) * 720,
      size: 6 + rnd() * 6,
      color: palette[i % palette.length]!,
    }));
  }, [count, width, colors]);
  if (reduceMotion) return null;
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {pieces.map((p, i) => (
        <ConfettiPiece key={i} piece={p} durationMs={durationMs} />
      ))}
    </View>
  );
}

function ConfettiPiece({ piece, durationMs }: { piece: Piece; durationMs: number }) {
  const { height } = useWindowDimensions();
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(
      withDelay(
        piece.delay,
        withTiming(1, { duration: durationMs, easing: Easing.in(Easing.quad) }),
      ),
    );
  }, [t, piece.delay, durationMs]);
  const style = useAnimatedStyle(() => ({
    opacity: 1 - t.get() * t.get(),
    transform: [
      { translateX: piece.x + piece.drift * t.get() },
      { translateY: -20 + t.get() * height * 0.9 },
      { rotate: `${piece.spin * t.get()}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: piece.size,
          height: piece.size * 1.6,
          borderRadius: 2,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
}
