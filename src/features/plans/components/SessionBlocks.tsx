import { router } from 'expo-router';
import { View } from 'react-native';

import { getExerciseInfo, type CompiledSession } from '@/content';
import { formatPrescription } from '@/features/workout-session/format';
import { useLooseT, useTranslation } from '@/i18n';
import { ExerciseTile, SectionHeader, Text, useTheme } from '@/ui';

/** A session's blocks (warm-up → main → finisher → cool-down) with prescriptions. */
export function SessionBlocks({ title, session }: { title: string; session: CompiledSession }) {
  const { t } = useTranslation();
  const lt = useLooseT();
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing[3] }}>
      <SectionHeader title={title} />
      {session.blocks.map((b, bi) => (
        <View key={`${b.title}-${bi}`} style={{ gap: spacing[2] }}>
          <Text variant="overline" color="textMuted">
            {t(`workout.blocks.${b.kind}`)} · {b.title}
          </Text>
          {b.items.map((item, i) => {
            const info = getExerciseInfo(item.exerciseId);
            return (
              <ExerciseTile
                key={`${item.exerciseId}-${i}`}
                name={info?.name ?? item.exerciseId}
                prescription={formatPrescription(item, info?.perSide ?? false, lt)}
                cameraTracked={Boolean(info?.tracked)}
                onPress={() =>
                  router.push({ pathname: '/exercise/[id]', params: { id: item.exerciseId } })
                }
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}
