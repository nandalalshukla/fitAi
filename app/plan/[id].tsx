import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { findPreviewPlan } from '@/features/plans/previewPlans';
import { useTranslation } from '@/i18n';
import {
  Button,
  Card,
  ErrorState,
  ExerciseTile,
  Icon,
  PressableScale,
  Screen,
  SectionHeader,
  Stagger,
  StatTile,
  Text,
  useTheme,
} from '@/ui';

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { spacing, colors, hitTarget, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const plan = id ? findPreviewPlan(id) : undefined;

  const back = (
    <PressableScale
      testID="back"
      accessibilityLabel={t('common.close')}
      onPress={() => router.back()}
      haptic="tap"
      style={{
        width: hitTarget,
        height: hitTarget,
        borderRadius: radii.pill,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name="chevron-back" />
    </PressableScale>
  );

  if (!plan) {
    return (
      <Screen>
        {back}
        <ErrorState
          title={t('plans.notFound')}
          retryLabel={t('errors.goHome')}
          onRetry={() => router.replace('/')}
        />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen testID="plan-detail-screen" contentStyle={{ paddingBottom: 120 + insets.bottom }}>
        {back}
        <Stagger index={0}>
          <Text variant="overline" color="accentText">
            {plan.goal} · {t(`plans.${plan.level}`)}
          </Text>
          <Text variant="displayL" accessibilityRole="header">
            {plan.title}
          </Text>
        </Stagger>
        <Stagger index={1} style={{ flexDirection: 'row', gap: spacing[2] }}>
          <StatTile label="Weeks" value={plan.weeks} />
          <StatTile label="Days / wk" value={plan.daysPerWeek} />
          <StatTile label="Minutes" value={plan.minutesPerSession} />
        </Stagger>
        <Stagger index={2}>
          <Card>
            <Text variant="h3">{t('plans.whatToExpect')}</Text>
            <Text variant="body" color="textMuted" style={{ marginTop: spacing[1] }}>
              {plan.summary}
            </Text>
          </Card>
        </Stagger>
        <View style={{ gap: spacing[3] }}>
          <SectionHeader title={t('plans.sampleSession')} />
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
      </Screen>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: spacing[5],
          paddingTop: spacing[3],
          paddingBottom: insets.bottom + spacing[3],
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <Button
          testID="select-plan"
          label={t('plans.selectPlan')}
          size="lg"
          fullWidth
          onPress={() => router.back()}
        />
      </View>
    </View>
  );
}
