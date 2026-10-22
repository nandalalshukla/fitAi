import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useMotion } from '../hooks/useMotion';
import { durations } from '../theme/motion';
import type { ColorTokens } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface EmptyStateProps {
  icon?: IconName;
  iconColor?: keyof ColorTokens;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

/** Friendly animated placeholder for empty lists (gently floating icon). */
export function EmptyState({
  icon = 'barbell-outline',
  iconColor = 'accentText',
  title,
  message,
  actionLabel,
  onAction,
  testID,
}: EmptyStateProps) {
  const { colors, spacing, radii } = useTheme();
  const { reduceMotion, enterFade } = useMotion();
  const float = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    float.set(
      withDelay(
        durations.slow,
        withRepeat(
          withSequence(
            withTiming(-6, { duration: durations.ambient }),
            withTiming(0, { duration: durations.ambient }),
          ),
          -1,
        ),
      ),
    );
  }, [float, reduceMotion]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.get() }] }));

  return (
    <Animated.View
      testID={testID}
      entering={enterFade}
      style={{ alignItems: 'center', padding: spacing[8], gap: spacing[3] }}
    >
      <Animated.View
        style={[
          {
            width: 88,
            height: 88,
            borderRadius: radii.xl,
            backgroundColor: colors.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
          },
          iconStyle,
        ]}
      >
        <Icon name={icon} size="xxl" color={iconColor} />
      </Animated.View>
      <Text variant="h2" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="body" color="textMuted" align="center">
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: spacing[2] }}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </Animated.View>
  );
}
