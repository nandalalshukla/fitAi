import type { BottomTabBarProps } from 'expo-router/tabs';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Icon, PressableScale, Text, spring, useTheme, type IconName } from '@/ui';

const ICONS: Record<string, { active: IconName; idle: IconName }> = {
  index: { active: 'flash', idle: 'flash-outline' },
  plans: { active: 'albums', idle: 'albums-outline' },
  exercises: { active: 'body', idle: 'body-outline' },
  progress: { active: 'stats-chart', idle: 'stats-chart-outline' },
  settings: { active: 'settings', idle: 'settings-outline' },
};

/** Custom tab bar: floating pill indicator that springs between tabs on the UI thread. */
export function AnimatedTabBar({
  state,
  descriptors,
  emitter,
  navigateToTab,
  insets,
}: BottomTabBarProps) {
  const { colors, spacing, radii, hitTarget } = useTheme();
  const [width, setWidth] = useState(0);
  const count = state.routes.length;
  const tabWidth = count > 0 ? width / count : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    x.set(withSpring(state.index * tabWidth, spring('snappy')));
  }, [state.index, tabWidth, x]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingBottom: Math.max(insets.bottom, spacing[2]),
        paddingTop: spacing[2],
      }}
    >
      <View
        accessibilityRole="tablist"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ flexDirection: 'row', maxWidth: 720, width: '100%', alignSelf: 'center' }}
      >
        {tabWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                top: 0,
                height: 32,
                width: tabWidth,
                alignItems: 'center',
              },
              indicator,
            ]}
          >
            <View
              style={{
                width: 56,
                height: 32,
                borderRadius: radii.pill,
                backgroundColor: colors.accentMuted,
              }}
            />
          </Animated.View>
        ) : null}
        {state.routes.map((route, index) => {
          const focused = index === state.index;
          const options = descriptors[route.key]?.options;
          const label = options?.title ?? route.name;
          const icons = ICONS[route.name] ?? { active: 'ellipse', idle: 'ellipse-outline' };
          return (
            <PressableScale
              key={route.key}
              testID={`tab-${route.name}`}
              haptic="tap"
              accessibilityRole="tab"
              accessibilityLabel={label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = emitter.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) navigateToTab(route.key);
              }}
              onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              style={{ flex: 1, alignItems: 'center', minHeight: hitTarget, gap: 2 }}
            >
              <View style={{ height: 32, justifyContent: 'center' }}>
                <Icon
                  name={focused ? icons.active : icons.idle}
                  size="lg"
                  color={focused ? 'accentText' : 'textSubtle'}
                />
              </View>
              <Text
                variant="caption"
                color={focused ? 'text' : 'textSubtle'}
                maxFontSizeMultiplier={1.2}
              >
                {label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </View>
  );
}
