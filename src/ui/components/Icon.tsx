import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import type { ColorTokens } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import type { iconSizes } from '../theme/tokens';

/** Single icon set across the app: Ionicons. */
export type IconName = ComponentProps<typeof Ionicons>['name'];

export interface IconProps {
  name: IconName;
  size?: keyof typeof iconSizes;
  color?: keyof ColorTokens;
  /** Icons are decorative by default; pass a label to expose to screen readers. */
  accessibilityLabel?: string;
}

export function Icon({ name, size = 'lg', color = 'text', accessibilityLabel }: IconProps) {
  const theme = useTheme();
  return (
    <Ionicons
      name={name}
      size={theme.iconSizes[size]}
      color={theme.colors[color]}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    />
  );
}
