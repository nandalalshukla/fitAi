import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { spring } from '../hooks/useMotion';
import { useTheme } from '../theme/ThemeProvider';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface TabOption<T extends string> {
  value: T;
  label: string;
}

export interface TabsProps<T extends string> {
  options: readonly TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}

/** Segmented control with a spring-animated indicator. */
export function Tabs<T extends string>({ options, value, onChange, testID }: TabsProps<T>) {
  const { colors, radii, spacing, hitTarget } = useTheme();
  const [width, setWidth] = useState(0);
  const segment = options.length > 0 ? width / options.length : 0;
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const indicator = useAnimatedStyle(() => ({
    width: segment,
    transform: [{ translateX: withSpring(index * segment, spring('snappy')) }],
  }));

  return (
    <View
      testID={testID}
      accessibilityRole="tablist"
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width - spacing[1] * 2)}
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: radii.pill,
        padding: spacing[1],
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: spacing[1],
            bottom: spacing[1],
            left: spacing[1],
            borderRadius: radii.pill,
            backgroundColor: colors.accent,
          },
          indicator,
        ]}
      />
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <PressableScale
            key={o.value}
            haptic="tap"
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              minHeight: hitTarget - 8,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="label" color={selected ? 'onAccent' : 'textMuted'}>
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
