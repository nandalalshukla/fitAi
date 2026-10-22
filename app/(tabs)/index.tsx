import { router } from 'expo-router';
import { View } from 'react-native';

import { previewPlans } from '@/features/plans/previewPlans';
import { useTranslation } from '@/i18n';
import {
  Button,
  Card,
  ExerciseTile,
  ProgressRing,
  Screen,
  SectionHeader,
  Stagger,
  StatTile,
  Text,
  useTheme,
} from '@/ui';

/** Home / Today. Wired to the active plan + history in Phases 5-6. */
export default function TodayScreen() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const plan = previewPlans[0];

  return (
    <Screen testID="today-screen">
      <Stagger index={0}>
        <Text variant="overline" color="textMuted">
          {t('today.todayWorkout')}
        </Text>
        <Text variant="displayL" accessibilityRole="header">
          {t('today.greeting')}
        </Text>
      </Stagger>

      {plan ? (
        <Stagger index={1}>
          <Card elevated padding={5}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
              <ProgressRing
                progress={0.35}
                size={84}
                strokeWidth={8}
                gradient
                accessibilityLabel="Plan progress"
              >
                <Text variant="h3">D3</Text>
              </ProgressRing>
              <View style={{ flex: 1, gap: spacing[1] }}>
                <Text variant="overline" color="accentText">
                  {plan.goal}
                </Text>
                <Text variant="h2">{plan.title}</Text>
                <Text variant="caption" color="textMuted">
                  {t('common.minutes', { count: plan.minutesPerSession })} · {plan.sample.length}{' '}
                  blocks
                </Text>
              </View>
            </View>
            <Button
              testID="start-workout"
              label={t('today.startWorkout')}
              icon="play"
              size="lg"
              fullWidth
              style={{ marginTop: spacing[5] }}
              onPress={() => router.push('/workout')}
            />
          </Card>
        </Stagger>
      ) : null}

      <Stagger index={2} style={{ flexDirection: 'row', gap: spacing[3] }}>
        <StatTile label={t('today.streak')} value={0} icon="flame" iconColor="ember" />
        <StatTile label={t('today.weekly')} value="0/5" icon="calendar-outline" />
      </Stagger>

      {plan ? (
        <View style={{ gap: spacing[3] }}>
          <SectionHeader title={t('today.todayWorkout')} />
          {plan.sample.map((ex, i) => (
            <Stagger key={ex.name} index={i + 3}>
              <ExerciseTile
                name={ex.name}
                prescription={ex.prescription}
                cameraTracked={ex.cameraTracked}
              />
            </Stagger>
          ))}
        </View>
      ) : null}

      <Button
        label={t('today.quickStart')}
        variant="secondary"
        icon="scan-outline"
        onPress={() => router.push('/workout')}
      />
    </Screen>
  );
}
