import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/ui';

/**
 * Darkens only the top and bottom of the camera preview so the header, counter and
 * buttons stay legible while the user can still see their whole body in the middle.
 */
export function CameraScrim() {
  const { colors } = useTheme();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient colors={[colors.overlay, 'transparent']} style={[styles.band, { top: 0 }]} />
      <LinearGradient
        colors={['transparent', colors.overlay]}
        style={[styles.band, { bottom: 0, height: '45%' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  band: { position: 'absolute', left: 0, right: 0, height: '30%' },
});
