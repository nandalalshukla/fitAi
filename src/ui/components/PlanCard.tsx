import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface PlanCardProps {
  title: string;
  goal: string;
  level: string;
  weeks: number;
  minutesPerSession: number;
  daysPerWeek: number;
  /** 0..1 progress through the plan when it's the active plan. */
  progress?: number;
  active?: boolean;
  onPress?: () => void;
  testID?: string;
}

/** Hero card for a workout plan, with accent gradient band and key facts. */
export function PlanCard({
  title,
  goal,
  level,
  weeks,
  minutesPerSession,
  daysPerWeek,
  progress,
  active = false,
  onPress,
  testID,
}: PlanCardProps) {
  const { colors, radii, spacing } = useTheme();
  const facts = `${weeks} wk · ${daysPerWeek}×/wk · ~${minutesPerSession} min`;
  return (
    <PressableScale
      testID={testID}
      onPress={onPress}
      scaleTo={0.98}
      accessibilityLabel={`${title}. ${goal}. ${level}. ${facts}${active ? '. Active plan' : ''}`}
      style={{
        borderRadius: radii.xl,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.border,
        overflow: 'hidden',
      }}
    >
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ height: 6 }}
      />
      <View style={{ padding: spacing[5], gap: spacing[2] }}>
        <View style={styles.row}>
          <Text variant="overline" color="accentText">
            {goal}
          </Text>
          {active ? (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: colors.accent,
                  borderRadius: radii.pill,
                  paddingHorizontal: spacing[2],
                },
              ]}
            >
              <Icon name="flash" size="sm" color="onAccent" />
              <Text variant="caption" color="onAccent">
                Active
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="displayM">{title}</Text>
        <Text variant="caption" color="textMuted">
          {level} · {facts}
        </Text>
        {typeof progress === 'number' ? (
          <View
            style={{
              height: 6,
              borderRadius: radii.pill,
              backgroundColor: colors.border,
              marginTop: spacing[2],
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`,
                height: '100%',
                backgroundColor: colors.accent,
              }}
            />
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
});
