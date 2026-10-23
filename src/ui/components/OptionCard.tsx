import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface OptionCardProps {
  title: string;
  description?: string;
  icon?: IconName;
  selected: boolean;
  onPress: () => void;
  /** Radio (single choice) or checkbox (multi choice) semantics. */
  multi?: boolean;
  testID?: string;
}

/** Large selectable card for onboarding-style choices. Selection = border + check icon, not colour alone. */
export function OptionCard({
  title,
  description,
  icon,
  selected,
  onPress,
  multi = false,
  testID,
}: OptionCardProps) {
  const { colors, radii, spacing, hitTarget } = useTheme();
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      haptic="tap"
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      accessibilityLabel={description ? `${title}. ${description}` : title}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[4],
        minHeight: hitTarget + 16,
        padding: spacing[4],
        borderRadius: radii.lg,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? colors.accentMuted : colors.surface,
      }}
    >
      {icon ? <Icon name={icon} color={selected ? 'accentText' : 'textMuted'} /> : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{title}</Text>
        {description ? (
          <Text variant="caption" color="textMuted">
            {description}
          </Text>
        ) : null}
      </View>
      <Icon
        name={
          selected
            ? multi
              ? 'checkbox'
              : 'checkmark-circle'
            : multi
              ? 'square-outline'
              : 'ellipse-outline'
        }
        color={selected ? 'accentText' : 'textSubtle'}
      />
    </PressableScale>
  );
}
