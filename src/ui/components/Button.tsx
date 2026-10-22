import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityHint,
  testID,
  style,
}: ButtonProps) {
  const { colors, radii, spacing, hitTarget } = useTheme();

  const palette = {
    primary: { bg: colors.accent, fg: 'onAccent', border: colors.accent },
    secondary: { bg: colors.surfaceElevated, fg: 'text', border: colors.borderStrong },
    ghost: { bg: 'transparent', fg: 'accentText', border: 'transparent' },
    danger: { bg: colors.danger, fg: 'onStatus', border: colors.danger },
  } as const;
  const v = palette[variant];
  const isDisabled = disabled || loading;
  const height = size === 'lg' ? hitTarget + 12 : hitTarget;

  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.base,
        {
          minHeight: height,
          paddingHorizontal: size === 'lg' ? spacing[6] : spacing[5],
          borderRadius: radii.pill,
          backgroundColor: v.bg,
          borderColor: v.border,
          opacity: isDisabled ? 0.5 : 1,
          alignSelf: fullWidth ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors[v.fg]} />
      ) : (
        <View style={[styles.row, { gap: spacing[2] }]}>
          {icon && iconPosition === 'left' ? <Icon name={icon} size="md" color={v.fg} /> : null}
          <Text variant={size === 'lg' ? 'h3' : 'label'} color={v.fg}>
            {label}
          </Text>
          {icon && iconPosition === 'right' ? <Icon name={icon} size="md" color={v.fg} /> : null}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
});
