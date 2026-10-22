import type { ReactNode } from 'react';
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '../theme/ThemeProvider';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** Safe-area edges to pad. Tab screens omit 'bottom' (tab bar handles it). */
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Root container for screens: theme background, safe areas, max content width for tablets. */
export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  contentStyle,
  testID,
}: ScreenProps) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const padding: ViewStyle = {
    paddingTop: edges.includes('top') ? insets.top + spacing[2] : spacing[2],
    paddingBottom: (edges.includes('bottom') ? insets.bottom : 0) + spacing[8],
    paddingLeft: Math.max(insets.left, spacing[5]),
    paddingRight: Math.max(insets.right, spacing[5]),
    gap: spacing[5],
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  };

  if (!scroll) {
    return (
      <View
        testID={testID}
        style={[{ flex: 1, backgroundColor: colors.background }, padding, contentStyle]}
      >
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      testID={testID}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[padding, contentStyle]}
      contentInsetAdjustmentBehavior="never"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
