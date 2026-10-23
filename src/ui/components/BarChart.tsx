import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { timing, useMotion } from '../hooks/useMotion';
import { useTheme } from '../theme/ThemeProvider';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface BarDatum {
  key: string;
  /** Short axis label (shown for some bars when there are many). */
  label: string;
  value: number;
  /** Spoken / tooltip text, e.g. "Mon 20 Oct: 3 sessions". */
  description: string;
}

export interface BarChartProps {
  data: readonly BarDatum[];
  height?: number;
  /** Accessible summary of the whole chart. */
  accessibilityLabel: string;
  testID?: string;
}

/**
 * Animated bar chart (bars grow in, staggered). Tap a bar to see its value;
 * every bar is also exposed to screen readers with its description.
 */
export function BarChart({ data, height = 160, accessibilityLabel, testID }: BarChartProps) {
  const { spacing } = useTheme();
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const labelEvery = Math.max(1, Math.ceil(data.length / 7));
  const sel = selected !== null ? data[selected] : undefined;
  return (
    <View testID={testID} accessibilityLabel={accessibilityLabel} style={{ gap: spacing[2] }}>
      <Text
        variant="caption"
        color="textMuted"
        style={{ minHeight: 18 }}
        accessibilityLiveRegion="polite"
      >
        {sel ? sel.description : ' '}
      </Text>
      <View
        style={{
          height,
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: data.length > 14 ? 2 : spacing[1],
        }}
      >
        {data.map((d, i) => (
          <Bar
            key={d.key}
            index={i}
            ratio={d.value / max}
            height={height}
            selected={selected === i}
            label={d.description}
            onPress={() => setSelected((s) => (s === i ? null : i))}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: data.length > 14 ? 2 : spacing[1] }}>
        {data.map((d, i) => (
          <Text
            key={d.key}
            variant="caption"
            color="textSubtle"
            align="center"
            numberOfLines={1}
            style={{ flex: 1, fontSize: 10 }}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            {i % labelEvery === 0 || i === data.length - 1 ? d.label : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Bar({
  index,
  ratio,
  height,
  selected,
  label,
  onPress,
}: {
  index: number;
  ratio: number;
  height: number;
  selected: boolean;
  label: string;
  onPress: () => void;
}) {
  const { colors, radii } = useTheme();
  const { reduceMotion } = useMotion();
  const grow = useSharedValue(reduceMotion ? ratio : 0);
  useEffect(() => {
    grow.set(
      reduceMotion
        ? ratio
        : withDelay(Math.min(index, 20) * 25, withTiming(ratio, timing('slow', 'emphasized'))),
    );
  }, [ratio, index, grow, reduceMotion]);
  const style = useAnimatedStyle(() => ({
    height: Math.max(ratio > 0 ? 4 : 2, grow.get() * height),
  }));
  return (
    <PressableScale
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{ flex: 1, height, justifyContent: 'flex-end' }}
    >
      <Animated.View
        style={[
          {
            borderRadius: radii.sm,
            backgroundColor: selected ? colors.ember : ratio > 0 ? colors.accent : colors.border,
          },
          style,
        ]}
      />
    </PressableScale>
  );
}
