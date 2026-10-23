import { View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export interface HeatmapCell {
  key: string;
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
  description: string;
}

export interface HeatmapProps {
  /** Columns (weeks) of 7 cells (Mon..Sun). */
  weeks: readonly (readonly HeatmapCell[])[];
  dayLabels: readonly string[];
  accessibilityLabel: string;
  lessLabel: string;
  moreLabel: string;
}

const OPACITY = [0, 0.3, 0.55, 0.8, 1];

/** Calendar heatmap of training days (intensity = minutes). Summarised for screen readers. */
export function Heatmap({
  weeks,
  dayLabels,
  accessibilityLabel,
  lessLabel,
  moreLabel,
}: HeatmapProps) {
  const { colors, spacing, radii } = useTheme();
  const cell = (level: number, future: boolean) => ({
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.sm / 2,
    backgroundColor: future ? 'transparent' : level === 0 ? colors.border : colors.accent,
    opacity: future ? 1 : level === 0 ? 1 : OPACITY[level],
    borderWidth: future ? 1 : 0,
    borderColor: colors.border,
  });
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={{ gap: spacing[2] }}>
      <View style={{ flexDirection: 'row', gap: 3 }}>
        <View style={{ gap: 3, justifyContent: 'space-between', paddingRight: spacing[1] }}>
          {dayLabels.map((d, i) => (
            <Text
              key={i}
              variant="caption"
              color="textSubtle"
              style={{ fontSize: 10, lineHeight: 12 }}
            >
              {i % 2 === 0 ? d : ' '}
            </Text>
          ))}
        </View>
        {weeks.map((w, wi) => (
          <View key={wi} style={{ flex: 1, gap: 3 }}>
            {w.map((c) => (
              <View key={c.key} style={cell(c.level, c.future)} />
            ))}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' }}>
        <Text variant="caption" color="textSubtle">
          {lessLabel}
        </Text>
        {[0, 1, 2, 3, 4].map((l) => (
          <View
            key={l}
            style={{
              width: 12,
              height: 12,
              ...cell(l, false),
              flex: undefined,
              aspectRatio: undefined,
            }}
          />
        ))}
        <Text variant="caption" color="textSubtle">
          {moreLabel}
        </Text>
      </View>
    </View>
  );
}
