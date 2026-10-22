import type { ReactNode } from 'react';
import { Modal as RNModal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

import { bezier } from '../hooks/useMotion';
import { durations } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from './Button';
import { Text } from './Text';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  /** Destructive confirmations use the danger button. */
  destructive?: boolean;
  testID?: string;
}

/** Centered dialog; use for confirmations before destructive actions. */
export function Modal({
  visible,
  onClose,
  title,
  message,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  destructive = false,
  testID,
}: ModalProps) {
  const { colors, radii, spacing } = useTheme();
  return (
    <RNModal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="none"
      statusBarTranslucent
    >
      {visible ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Animated.View
            entering={FadeIn.duration(durations.base)}
            exiting={FadeOut.duration(durations.fast)}
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={cancelLabel ?? 'Close'}
            />
          </Animated.View>
          <Animated.View
            testID={testID}
            accessibilityViewIsModal
            entering={ZoomIn.duration(durations.base).easing(bezier('decelerate'))}
            style={{
              width: '86%',
              maxWidth: 420,
              backgroundColor: colors.surfaceElevated,
              borderRadius: radii.xl,
              padding: spacing[6],
              gap: spacing[3],
            }}
          >
            <Text variant="h2" accessibilityRole="header">
              {title}
            </Text>
            {message ? (
              <Text variant="body" color="textMuted">
                {message}
              </Text>
            ) : null}
            {children}
            {confirmLabel || cancelLabel ? (
              <View style={{ gap: spacing[2], marginTop: spacing[2] }}>
                {confirmLabel ? (
                  <Button
                    testID={testID ? `${testID}-confirm` : undefined}
                    label={confirmLabel}
                    variant={destructive ? 'danger' : 'primary'}
                    onPress={onConfirm}
                    fullWidth
                  />
                ) : null}
                {cancelLabel ? (
                  <Button
                    testID={testID ? `${testID}-cancel` : undefined}
                    label={cancelLabel}
                    variant="ghost"
                    onPress={onClose}
                    fullWidth
                  />
                ) : null}
              </View>
            ) : null}
          </Animated.View>
        </View>
      ) : null}
    </RNModal>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
