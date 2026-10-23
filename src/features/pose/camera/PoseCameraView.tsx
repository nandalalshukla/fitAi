import { useIsFocused } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import { Camera, useCameraPermission } from 'react-native-vision-camera';

import { useTranslation } from '@/i18n';
import { EmptyState, ErrorState, Skeleton, useTheme } from '@/ui';

import type { PerfStats } from '../domain/perf';
import type { Pose } from '../domain/types';
import type { PoseModelId } from '../estimators';
import { SkeletonOverlay, type FormLevel } from '../overlay/SkeletonOverlay';
import { usePoseFrameProcessor, type EstimatorStatus } from './usePoseFrameProcessor';

export interface PoseCameraViewProps {
  modelId: PoseModelId;
  position: 'front' | 'back';
  showSkeleton?: boolean;
  formLevel?: SharedValue<FormLevel>;
  /** Render-prop for overlays that need the pose/stats shared values (debug HUD, rep counter). */
  children?: (ctx: {
    pose: SharedValue<Pose | null>;
    stats: SharedValue<PerfStats | null>;
    status: EstimatorStatus;
  }) => ReactNode;
  testID?: string;
  /** Called when the camera can't be used (permission permanently denied, model failed). */
  onUnavailable?: (reason: 'permission' | 'model') => void;
}

function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);
  return active;
}

/**
 * Camera preview + on-device pose inference + Skia skeleton, with permission
 * and model-loading states. The camera only runs while the screen is focused
 * and the app is in the foreground (interruptions/backgrounding pause it).
 */
export function PoseCameraView({
  modelId,
  position,
  showSkeleton = true,
  formLevel,
  children,
  testID,
  onUnavailable,
}: PoseCameraViewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const permission = useCameraPermission();
  const focused = useIsFocused();
  const appActive = useAppActive();
  const { frameOutput, pose, stats, status } = usePoseFrameProcessor({ modelId });
  const denied = !permission.hasPermission && !permission.canRequestPermission;
  const failed = status.state === 'error';
  useEffect(() => {
    if (denied) onUnavailable?.('permission');
    else if (failed) onUnavailable?.('model');
  }, [denied, failed, onUnavailable]);

  if (!permission.hasPermission) {
    return permission.canRequestPermission ? (
      <EmptyState
        testID="camera-permission-request"
        icon="videocam-outline"
        title={t('camera.permissionTitle')}
        message={t('camera.permissionMessage')}
        actionLabel={t('camera.allow')}
        onAction={() => void permission.requestPermission()}
      />
    ) : (
      <EmptyState
        testID="camera-permission-denied"
        icon="videocam-off-outline"
        iconColor="warningText"
        title={t('camera.deniedTitle')}
        message={t('camera.deniedMessage')}
        actionLabel={t('camera.openSettings')}
        onAction={() => void Linking.openSettings()}
      />
    );
  }

  if (status.state === 'error') {
    return <ErrorState title={t('camera.modelErrorTitle')} message={status.message} />;
  }

  return (
    <View testID={testID} style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={position}
        isActive={focused && appActive}
        outputs={[frameOutput]}
        resizeMode="cover"
        mirrorMode="auto"
      />
      {showSkeleton ? (
        <SkeletonOverlay pose={pose} formLevel={formLevel} resizeMode="cover" />
      ) : null}
      {status.state === 'loading' ? (
        <View style={[StyleSheet.absoluteFill, styles.center]}>
          <Skeleton width={160} height={16} />
        </View>
      ) : null}
      {children?.({ pose, stats, status })}
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
