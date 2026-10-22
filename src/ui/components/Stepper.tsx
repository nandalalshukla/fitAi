import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { AnimatedCounter } from './AnimatedCounter';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  testID?: string;
}

export const clampStep = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** +/- numeric stepper (manual rep correction, rest extension, settings). */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  label,
  testID,
}: StepperProps) {
  const { colors, radii, spacing, hitTarget } = useTheme();
  const button = (dir: -1 | 1) => {
    const next = clampStep(value + dir * step, min, max);
    const disabled = next === value;
    return (
      <PressableScale
        testID={testID ? `${testID}-${dir < 0 ? 'dec' : 'inc'}` : undefined}
        disabled={disabled}
        haptic="tap"
        accessibilityLabel={`${dir < 0 ? 'Decrease' : 'Increase'} ${label}`}
        onPress={() => onChange(next)}
        style={{
          width: hitTarget,
          height: hitTarget,
          borderRadius: radii.pill,
          backgroundColor: colors.surfaceElevated,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <Icon name={dir < 0 ? 'remove' : 'add'} size="lg" />
      </PressableScale>
    );
  };

  return (
    <View
      testID={testID}
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const dir = e.nativeEvent.actionName === 'increment' ? 1 : -1;
        onChange(clampStep(value + dir * step, min, max));
      }}
      style={{ alignItems: 'center', gap: spacing[1] }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
        {button(-1)}
        <View style={{ minWidth: 64 }}>
          <AnimatedCounter value={value} variant="displayM" />
        </View>
        {button(1)}
      </View>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}
