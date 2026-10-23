import { Switch as RNSwitch } from 'react-native';

import { haptics } from '../haptics';
import { useTheme } from '../theme/ThemeProvider';

export interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
  testID?: string;
}

/** Themed native switch (state is exposed to screen readers by the platform control). */
export function Switch({
  value,
  onValueChange,
  accessibilityLabel,
  disabled,
  testID,
}: SwitchProps) {
  const { colors } = useTheme();
  return (
    <RNSwitch
      testID={testID}
      value={value}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      onValueChange={(v) => {
        haptics.tap();
        onValueChange(v);
      }}
      trackColor={{ false: colors.borderStrong, true: colors.accent }}
      thumbColor={value ? colors.onAccent : colors.text}
      ios_backgroundColor={colors.borderStrong}
    />
  );
}
