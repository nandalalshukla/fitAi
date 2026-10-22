import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  const { spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing[2],
      }}
    >
      <Text variant="h2" accessibilityRole="header">
        {title}
      </Text>
      {actionLabel && onAction ? (
        <PressableScale
          onPress={onAction}
          haptic="tap"
          hitSlop={12}
          accessibilityLabel={actionLabel}
        >
          <Text variant="label" color="accentText">
            {actionLabel}
          </Text>
        </PressableScale>
      ) : null}
    </View>
  );
}
