import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  /** Right-side content (switch, value). Defaults to a chevron when pressable. */
  trailing?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  testID?: string;
}

export function ListItem({
  title,
  subtitle,
  icon,
  trailing,
  onPress,
  destructive,
  testID,
}: ListItemProps) {
  const { spacing, hitTarget } = useTheme();
  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: hitTarget + 8,
        paddingVertical: spacing[2],
        gap: spacing[3],
      }}
    >
      {icon ? (
        <Icon name={icon} size="lg" color={destructive ? 'dangerText' : 'textMuted'} />
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" color={destructive ? 'dangerText' : 'text'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="textMuted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? (onPress ? <Icon name="chevron-forward" size="md" color="textSubtle" /> : null)}
    </View>
  );

  if (!onPress) return <View testID={testID}>{content}</View>;
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      haptic="tap"
      scaleTo={0.985}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
    >
      {content}
    </PressableScale>
  );
}
