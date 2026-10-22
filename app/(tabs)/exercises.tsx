import { View } from 'react-native';

import { previewPlans } from '@/features/plans/previewPlans';
import { useTranslation } from '@/i18n';
import { ExerciseTile, Screen, Stagger, Text } from '@/ui';

export default function ExercisesScreen() {
  const { t } = useTranslation();
  const names = Array.from(new Set(previewPlans.flatMap((p) => p.sample.map((s) => s.name))));
  return (
    <Screen testID="exercises-screen">
      <View>
        <Text variant="displayL" accessibilityRole="header">
          {t('exercises.title')}
        </Text>
        <Text variant="body" color="textMuted">
          {t('exercises.subtitle')}
        </Text>
      </View>
      {names.map((name, i) => (
        <Stagger key={name} index={i}>
          <ExerciseTile name={name} cameraTracked />
        </Stagger>
      ))}
    </Screen>
  );
}
