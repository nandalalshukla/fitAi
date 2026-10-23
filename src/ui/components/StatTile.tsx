import { View } from 'react-native';

import type { ColorTokens } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import { type IconName } from './Icon';
import { PulseIcon } from './PulseIcon';
import { Text } from './Text';

export interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: IconName;
  iconColor?: keyof ColorTokens;
  /** Pulse the icon (e.g. an active streak flame). */
  animateIcon?: boolean;
  testID?: string;
}

export function StatTile({
  label,
  value,
  unit,
  icon,
  iconColor = 'accentText',
  animateIcon = false,
  testID,
}: StatTileProps) {
  const { colors, radii, spacing } = useTheme();
  return (
    <View
      testID={testID}
      accessible
      accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}`}
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing[4],
        gap: spacing[1],
      }}
    >
      {icon ? <PulseIcon name={icon} size="md" color={iconColor} active={animateIcon} /> : null}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing[1] }}>
        <Text variant="displayM" style={{ textTransform: 'none' }}>
          {value}
        </Text>
        {unit ? (
          <Text variant="caption" color="textMuted">
            {unit}
          </Text>
        ) : null}
      </View>
      <Text variant="caption" color="textMuted" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
