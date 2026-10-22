import { useEffect, useState, type ReactNode } from 'react';
import { Modal as RNModal, Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { spring, timing } from '../hooks/useMotion';
import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  testID?: string;
}

const DISMISS_DISTANCE = 120;
const OFFSCREEN = 800;

/** Draggable bottom sheet: spring in, drag down (or tap scrim) to dismiss. */
export function BottomSheet({ visible, onClose, title, children, testID }: BottomSheetProps) {
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(OFFSCREEN);
  const backdrop = useSharedValue(0);

  // Mount immediately when opened (state adjustment during render, not in an effect).
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      translateY.set(withSpring(0, spring('gentle')));
      backdrop.set(withTiming(1, timing('base')));
    } else if (mounted) {
      backdrop.set(withTiming(0, timing('fast')));
      translateY.set(
        withTiming(OFFSCREEN, timing('base', 'accelerate'), (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, mounted, translateY, backdrop]);

  const pan = Gesture.Pan()
    .onChange((e) => {
      translateY.set(Math.max(0, translateY.get() + e.changeY));
    })
    .onEnd((e) => {
      if (translateY.get() > DISMISS_DISTANCE || e.velocityY > 900) {
        scheduleOnRN(onClose);
      } else {
        translateY.set(withSpring(0, spring('gentle')));
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.get() }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.get() }));

  if (!mounted) return null;

  return (
    <RNModal transparent visible statusBarTranslucent onRequestClose={onClose} animationType="none">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }, backdropStyle]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>
        <GestureDetector gesture={pan}>
          <Animated.View
            testID={testID}
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surfaceElevated,
                borderTopLeftRadius: radii.xl,
                borderTopRightRadius: radii.xl,
                paddingHorizontal: spacing[5],
                paddingBottom: insets.bottom + spacing[5],
                gap: spacing[4],
              },
              sheetStyle,
            ]}
          >
            <View
              style={[
                styles.handle,
                { backgroundColor: colors.borderStrong, marginTop: spacing[2] },
              ]}
            />
            {title ? <Text variant="h2">{title}</Text> : null}
            {children}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center' },
});
