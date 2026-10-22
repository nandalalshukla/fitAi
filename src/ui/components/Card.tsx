import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import type { SpacingKey } from '../theme/tokens';
import { PressableScale } from './PressableScale';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  padding?: SpacingKey;
  elevated?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  onPress,
  padding = 4,
  elevated = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}: CardProps) {
  const theme = useTheme();
  const cardStyle: StyleProp<ViewStyle> = [
    {
      backgroundColor: elevated ? theme.colors.surfaceElevated : theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing[padding],
      borderWidth: 1,
      borderColor: theme.colors.border,
      overflow: 'hidden',
    },
    elevated && theme.scheme === 'light' ? theme.elevation.low : null,
    style,
  ];

  if (onPress) {
    return (
      <PressableScale
        testID={testID}
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        scaleTo={0.98}
        style={cardStyle}
      >
        {children}
      </PressableScale>
    );
  }
  return (
    <View testID={testID} style={cardStyle} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}
