import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getPlan, type PlanDay } from '@/content';
import { useActivePlan, useEnrollPlan } from '@/features/plans';
import { SessionBlocks } from '@/features/plans/components/SessionBlocks';
import { useTranslation } from '@/i18n';
import {
  Button,
  Card,
  Chip,
  ErrorState,
  Icon,
  ListItem,
  Modal,
  PressableScale,
  Screen,
  SectionHeader,
  Stagger,
  StatTile,
  Text,
  useTheme,
  useToast,
} from '@/ui';

/** Plan detail: what to expect, safety, week-by-week schedule, a sample session; start/switch. */
export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { spacing, colors, hitTarget, radii } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const plan = id ? getPlan(id) : undefined;
  const active = useActivePlan().data;
  const enroll = useEnrollPlan();
  const [week, setWeek] = useState(1);
  const [confirm, setConfirm] = useState(false);

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

  const isCurrent = active?.plan.id === plan.id;
  const sample = plan.schedule.find((d) => d.type === 'workout')?.session;
  const days = plan.schedule.filter((d) => d.week === week);

  const start = () => {
    setConfirm(false);
    enroll.mutate(plan.id, {
      onSuccess: () => {
        toast.show({ message: t('plans.started', { title: plan.title }), kind: 'success' });
        router.dismissTo('/');
      },
      onError: (e) => toast.show({ message: e.message, kind: 'error' }),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen testID="plan-detail-screen" contentStyle={{ paddingBottom: 120 + insets.bottom }}>
        {back}
        <Stagger index={0}>
          <Text variant="overline" color="accentText">
            {t(`onboarding.goals.${plan.goal}`)} · {t(`plans.${plan.level}`)}
          </Text>
          <Text variant="displayL" accessibilityRole="header">
            {plan.title}
          </Text>
          <Text variant="body" color="textMuted">
            {plan.summary}
          </Text>
        </Stagger>
        <Stagger index={1} style={{ flexDirection: 'row', gap: spacing[2] }}>
          <StatTile label={t('plans.weeks')} value={plan.weeks} />
          <StatTile label={t('plans.daysPerWeek')} value={plan.daysPerWeek} />
          <StatTile label={t('plans.minutes')} value={plan.minutesPerSession} />
        </Stagger>
        <Stagger index={2}>
          <Card>
            <Text variant="h3">{t('plans.whatToExpect')}</Text>
            {plan.whatToExpect.map((line) => (
              <Bullet key={line} icon="checkmark-circle-outline" text={line} />
            ))}
            <Text variant="caption" color="textMuted" style={{ marginTop: spacing[3] }}>
              {t('plans.equipment')}:{' '}
              {plan.equipment
                .map((e) =>
                  e === 'none' ? t('plans.noEquipment') : t(`onboarding.equipment.${e}`),
                )
                .join(', ')}
            </Text>
          </Card>
        </Stagger>
        <Stagger index={3}>
          <Card>
            <Text variant="h3">{t('plans.safety')}</Text>
            {plan.safetyNotes.map((line) => (
              <Bullet key={line} icon="medkit-outline" text={line} />
            ))}
          </Card>
        </Stagger>

        <View style={{ gap: spacing[3] }}>
          <SectionHeader title={t('plans.schedule')} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing[2] }}
          >
            {Array.from({ length: plan.weeks }, (_, i) => i + 1).map((w) => (
              <Chip
                key={w}
                testID={`week-${w}`}
                label={
                  plan.schedule.find((d) => d.week === w)?.deload
                    ? `${t('plans.weekN', { week: w })} · ${t('plans.deload')}`
                    : t('plans.weekN', { week: w })
                }
                selected={week === w}
                onPress={() => setWeek(w)}
              />
            ))}
          </ScrollView>
          <Card padding={2}>
            {days.map((d) => (
              <DayRow
                key={d.day}
                day={d}
                current={isCurrent && active?.enrollment.currentDay === d.day}
              />
            ))}
          </Card>
        </View>

        {sample ? <SessionBlocks title={t('plans.sampleSession')} session={sample} /> : null}
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
        {isCurrent ? (
          <Button
            testID="select-plan"
            label={t('plans.viewToday')}
            variant="secondary"
            size="lg"
            fullWidth
            onPress={() => router.dismissTo('/')}
          />
        ) : (
          <Button
            testID="select-plan"
            label={active ? t('plans.switchPlan') : t('plans.selectPlan')}
            size="lg"
            fullWidth
            loading={enroll.isPending}
            onPress={() => (active ? setConfirm(true) : start())}
          />
        )}
      </View>
      <Modal
        testID="switch-plan-modal"
        visible={confirm}
        onClose={() => setConfirm(false)}
        title={t('plans.switchTitle')}
        message={t('plans.switchMessage', { current: active?.plan.title ?? '' })}
        confirmLabel={t('plans.switchPlan')}
        cancelLabel={t('common.cancel')}
        onConfirm={start}
      />
    </View>
  );
}

function Bullet({ icon, text }: { icon: Parameters<typeof Icon>[0]['name']; text: string }) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] }}>
      <Icon name={icon} size="md" color="accentText" />
      <Text variant="body" color="textMuted" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

function DayRow({ day, current }: { day: PlanDay; current: boolean }) {
  const { t } = useTranslation();
  const title =
    day.type === 'rest'
      ? t('plans.rest')
      : day.type === 'active_recovery'
        ? t('plans.activeRecovery')
        : day.session!.title;
  return (
    <ListItem
      icon={day.type === 'rest' ? 'moon-outline' : current ? 'play-circle' : 'barbell-outline'}
      title={`${t('plans.dayN', { day: day.day })} · ${title}`}
      subtitle={
        day.session ? t('common.minutes', { count: day.session.estimatedMinutes }) : undefined
      }
    />
  );
}
