import { StyleSheet, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

import type { Pose } from '@/features/pose/domain/types';
import { useTranslation } from '@/i18n';
import { AnimatedCounter, Text, useTheme } from '@/ui';

import type { Difficulty, ExerciseId } from '../domain/types';
import { useExerciseEngine } from './useExerciseEngine';

/** DEV ONLY overlay for the Pose lab: live reps, phase, quality, last form cue, classifier guess. */
export function ExerciseHud({
  pose,
  mode,
  difficulty,
}: {
  pose: SharedValue<Pose | null>;
  mode: ExerciseId | 'auto';
  difficulty: Difficulty;
}) {
  const { t } = useTranslation();
  const { colors, radii, spacing } = useTheme();
  const hud = useExerciseEngine(pose, mode, difficulty);
  const s = hud.snapshot;
  const cueColor =
    hud.lastCue?.severity === 'critical'
      ? 'dangerText'
      : hud.lastCue?.severity === 'warning'
        ? 'warningText'
        : 'text';
  const isHold = hud.active === 'plank';

  return (
    <View
      pointerEvents="none"
      style={[
        styles.box,
        {
          backgroundColor: colors.overlay,
          borderRadius: radii.md,
          padding: spacing[3],
          gap: spacing[1],
        },
      ]}
    >
      <Text variant="overline" color="accentText">
        {hud.active ? t(`exercises.names.${hud.active}`) : t('poseLab.detecting')}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing[2] }}>
        <AnimatedCounter
          value={isHold ? Math.floor((s?.heldMs ?? 0) / 1000) : (s?.reps ?? 0)}
          variant="displayL"
          testID="hud-reps"
        />
        <Text variant="caption" color="textMuted">
          {isHold ? 's' : t('poseLab.reps')}
          {s ? ` · ${s.phase} · ${s.view}` : ''}
        </Text>
      </View>
      {s?.averageQuality != null ? (
        <Text variant="caption" color="textMuted">
          {t('poseLab.formScore', { score: s.averageQuality })}
        </Text>
      ) : null}
      {s && !s.visible ? (
        <Text variant="bodyStrong" color="warningText">
          {t('cues.stepBack')}
        </Text>
      ) : hud.lastCue ? (
        <Text variant="bodyStrong" color={cueColor}>
          {t(hud.lastCue.key as never)}
        </Text>
      ) : null}
      {hud.classification[0] ? (
        <Text variant="caption" color="textSubtle">
          {t('poseLab.looksLike', {
            name: t(`exercises.names.${hud.classification[0].exercise}`),
            confidence: Math.round(hud.classification[0].confidence * 100),
          })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', right: 8, bottom: 8, minWidth: 180, maxWidth: 260 },
});
