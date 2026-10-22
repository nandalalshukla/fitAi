import { StyleSheet } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  testID?: string;
}

/** Filter / choice chip. Selection is shown with fill AND a check icon (not color alone). */
export function Chip({ label, selected = false, onPress, icon, testID }: ChipProps) {
  const { colors, radii, spacing, hitTarget } = useTheme();
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[
        styles.base,
        {
          minHeight: hitTarget - 8,
          paddingHorizontal: spacing[4],
          gap: spacing[1],
          borderRadius: radii.pill,
          backgroundColor: selected ? colors.accent : colors.surface,
          borderColor: selected ? colors.accent : colors.borderStrong,
        },
      ]}
      hitSlop={4}
    >
      {selected ? (
        <Icon name="checkmark" size="sm" color="onAccent" />
      ) : icon ? (
        <Icon name={icon} size="sm" color="textMuted" />
      ) : null}
      <Text variant="label" color={selected ? 'onAccent' : 'text'}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
});
