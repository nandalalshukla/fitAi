import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface ExerciseTileProps {
  name: string;
  /** e.g. "3 × 20" or "45 s". */
  prescription?: string;
  muscles?: string;
  icon?: IconName;
  cameraTracked?: boolean;
  onPress?: () => void;
  testID?: string;
}

export function ExerciseTile({
  name,
  prescription,
  muscles,
  icon = 'body-outline',
  cameraTracked = false,
  onPress,
  testID,
}: ExerciseTileProps) {
  const { colors, radii, spacing, hitTarget } = useTheme();
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      disabled={!onPress}
      haptic="tap"
      scaleTo={0.98}
      accessibilityLabel={[name, prescription, muscles, cameraTracked ? 'camera tracked' : null]
        .filter(Boolean)
        .join(', ')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        padding: spacing[3],
        minHeight: hitTarget + 16,
        borderRadius: radii.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View
        style={{
          width: hitTarget,
          height: hitTarget,
          borderRadius: radii.sm,
          backgroundColor: colors.surfaceElevated,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size="lg" color="accentText" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {name}
        </Text>
        {muscles ? (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {muscles}
          </Text>
        ) : null}
      </View>
      {cameraTracked ? <Icon name="videocam-outline" size="md" color="textSubtle" /> : null}
      {prescription ? (
        <Text variant="h3" style={{ fontVariant: ['tabular-nums'] }}>
          {prescription}
        </Text>
      ) : null}
    </PressableScale>
  );
}
