import { useQueryClient } from '@tanstack/react-query';
import { Redirect, router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCameraPermission } from 'react-native-vision-camera';

import { logger } from '@/core';
import { plans, type Equipment, type Goal, type Level } from '@/content';
import { useProfileQuery } from '@/data';
import { useUserId } from '@/features/auth';
import { completeOnboarding } from '@/features/onboarding/completeOnboarding';
import { recommendPlans } from '@/features/plans';
import { useTranslation } from '@/i18n';
import {
  Button,
  Card,
  Chip,
  Icon,
  OptionCard,
  PlanCard,
  Stepper,
  Switch,
  Text,
  timing,
  useMotion,
  useTheme,
  useToast,
  type IconName,
} from '@/ui';

const STEPS = [
  'welcome',
  'goal',
  'level',
  'equipment',
  'days',
  'permissions',
  'safety',
  'plan',
] as const;
type Step = (typeof STEPS)[number];

const GOAL_ICONS: Record<Goal, IconName> = {
  core: 'body-outline',
  fat_loss: 'flame-outline',
  strength: 'barbell-outline',
  muscle: 'fitness-outline',
  mobility: 'accessibility-outline',
  general: 'heart-outline',
  low_impact: 'leaf-outline',
};
const EXTRA_EQUIPMENT: Exclude<Equipment, 'none'>[] = ['mat', 'chair', 'wall', 'dumbbells', 'band'];
const REMINDER_TIMES = [
  { hour: 7, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 18, minute: 0 },
  { hour: 20, minute: 0 },
];
const hhmm = (h: number, m: number) =>
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

/**
 * First-run onboarding: goal, level, equipment, days/week, permissions education,
 * safety disclaimer and a recommended plan. Ends on Today with the plan started.
 */
export default function OnboardingScreen() {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();
  const { reduceMotion } = useMotion();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const qc = useQueryClient();
  const userId = useUserId();
  const profile = useProfileQuery(userId);
  const camera = useCameraPermission();

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [level, setLevel] = useState<Level | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [days, setDays] = useState(4);
  const [reminder, setReminder] = useState({ enabled: true, hour: 18, minute: 0 });
  const [accepted, setAccepted] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const ranked = useMemo(
    () => recommendPlans(plans, { goal, level, equipment, daysPerWeek: days }),
    [goal, level, equipment, days],
  );
  const chosen = planId ?? ranked[0]?.id ?? null;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(index / (STEPS.length - 1), timing('slow')));
  }, [index, progress]);
  const barStyle = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  // Signed in on this device with an account that already finished onboarding.
  if (profile.data?.onboardingCompletedAt && !saving) return <Redirect href="/" />;

  const step: Step = STEPS[index]!;
  const go = (d: 1 | -1) => {
    setDirection(d);
    setIndex((i) => Math.min(STEPS.length - 1, Math.max(0, i + d)));
  };
  const canNext: Record<Step, boolean> = {
    welcome: true,
    goal: goal !== null,
    level: level !== null,
    equipment: true,
    days: true,
    permissions: true,
    safety: accepted,
    plan: chosen !== null,
  };

  const finish = async () => {
    if (!goal || !level || !chosen) return;
    setSaving(true);
    try {
      await completeOnboarding({
        goal,
        level,
        equipment,
        daysPerWeek: days,
        planId: chosen,
        reminder,
      });
      await qc.invalidateQueries({ queryKey: ['user'] });
      router.replace('/');
    } catch (e) {
      logger.error('Onboarding failed', { error: String(e) });
      toast.show({ message: String(e instanceof Error ? e.message : e), kind: 'error' });
      setSaving(false);
    }
  };

  const entering = reduceMotion ? FadeIn : direction > 0 ? SlideInRight : SlideInLeft;
  const exiting = reduceMotion ? FadeOut : direction > 0 ? SlideOutLeft : SlideOutRight;

  return (
    <View
      testID="onboarding-screen"
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}
    >
      {step !== 'welcome' ? (
        <View style={{ paddingHorizontal: spacing[5], paddingTop: spacing[3], gap: spacing[2] }}>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel={t('onboarding.step', { step: index, total: STEPS.length - 1 })}
            style={{
              height: 6,
              borderRadius: radii.pill,
              backgroundColor: colors.border,
              overflow: 'hidden',
            }}
          >
            <Animated.View style={[{ height: 6, backgroundColor: colors.accent }, barStyle]} />
          </View>
          <Text variant="caption" color="textMuted">
            {t('onboarding.step', { step: index, total: STEPS.length - 1 })}
          </Text>
        </View>
      ) : null}

      <Animated.View
        key={step}
        entering={entering.duration(260)}
        exiting={exiting.duration(200)}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: spacing[5], gap: spacing[4], flexGrow: 1 }}>
          {step === 'welcome' ? <Welcome /> : null}

          {step === 'goal' ? (
            <Question title={t('onboarding.goalTitle')}>
              {(Object.keys(GOAL_ICONS) as Goal[]).map((g) => (
                <OptionCard
                  key={g}
                  testID={`goal-${g}`}
                  icon={GOAL_ICONS[g]}
                  title={t(`onboarding.goals.${g}`)}
                  selected={goal === g}
                  onPress={() => setGoal(g)}
                />
              ))}
            </Question>
          ) : null}

          {step === 'level' ? (
            <Question title={t('onboarding.levelTitle')}>
              {(['beginner', 'intermediate', 'advanced'] as const).map((l) => (
                <OptionCard
                  key={l}
                  testID={`level-${l}`}
                  title={t(`onboarding.levels.${l}`)}
                  description={t(`onboarding.levels.${l}Hint`)}
                  selected={level === l}
                  onPress={() => setLevel(l)}
                />
              ))}
            </Question>
          ) : null}

          {step === 'equipment' ? (
            <Question title={t('onboarding.equipmentTitle')} hint={t('onboarding.equipmentHint')}>
              {EXTRA_EQUIPMENT.map((e) => (
                <OptionCard
                  key={e}
                  multi
                  title={t(`onboarding.equipment.${e}`)}
                  selected={equipment.includes(e)}
                  onPress={() =>
                    setEquipment((cur) =>
                      cur.includes(e) ? cur.filter((x) => x !== e) : [...cur, e],
                    )
                  }
                />
              ))}
            </Question>
          ) : null}

          {step === 'days' ? (
            <Question title={t('onboarding.daysTitle')} hint={t('onboarding.daysHint')}>
              <Stepper
                testID="days-stepper"
                label={t('onboarding.daysLabel')}
                value={days}
                onChange={setDays}
                min={2}
                max={6}
              />
            </Question>
          ) : null}

          {step === 'permissions' ? (
            <Question title={t('onboarding.permissionsTitle')}>
              <Card>
                <View style={{ flexDirection: 'row', gap: spacing[3] }}>
                  <Icon name="videocam-outline" color="accentText" />
                  <View style={{ flex: 1, gap: spacing[1] }}>
                    <Text variant="h3">{t('onboarding.cameraTitle')}</Text>
                    <Text variant="body" color="textMuted">
                      {t('onboarding.cameraBody')}
                    </Text>
                    {camera.hasPermission ? (
                      <Text variant="bodyStrong" color="successText">
                        {t('onboarding.cameraAllowed')}
                      </Text>
                    ) : (
                      <Button
                        testID="allow-camera"
                        label={t('camera.allow')}
                        variant="secondary"
                        onPress={() => void camera.requestPermission()}
                      />
                    )}
                  </View>
                </View>
              </Card>
              <Card>
                <View style={{ flexDirection: 'row', gap: spacing[3] }}>
                  <Icon name="notifications-outline" color="accentText" />
                  <View style={{ flex: 1, gap: spacing[2] }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                      <Text variant="h3" style={{ flex: 1 }}>
                        {t('onboarding.notificationsTitle')}
                      </Text>
                      <Switch
                        testID="reminder-switch"
                        accessibilityLabel={t('onboarding.notificationsTitle')}
                        value={reminder.enabled}
                        onValueChange={(enabled) => setReminder((r) => ({ ...r, enabled }))}
                      />
                    </View>
                    <Text variant="body" color="textMuted">
                      {t('onboarding.notificationsBody')}
                    </Text>
                    {reminder.enabled ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
                        {REMINDER_TIMES.map((r) => (
                          <Chip
                            key={r.hour}
                            label={hhmm(r.hour, r.minute)}
                            selected={reminder.hour === r.hour && reminder.minute === r.minute}
                            onPress={() => setReminder((cur) => ({ ...cur, ...r }))}
                          />
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              </Card>
            </Question>
          ) : null}

          {step === 'safety' ? (
            <Question title={t('onboarding.safetyTitle')}>
              <Card>
                <View style={{ flexDirection: 'row', gap: spacing[3] }}>
                  <Icon name="medkit-outline" color="warningText" />
                  <View style={{ flex: 1, gap: spacing[2] }}>
                    <Text variant="body">{t('onboarding.safetyBody')}</Text>
                    <Text variant="bodyStrong">{t('onboarding.safetyStop')}</Text>
                  </View>
                </View>
              </Card>
              <OptionCard
                testID="accept-safety"
                multi
                title={t('onboarding.safetyAccept')}
                selected={accepted}
                onPress={() => setAccepted((v) => !v)}
              />
            </Question>
          ) : null}

          {step === 'plan' ? (
            <Question title={t('onboarding.planTitle')} hint={t('onboarding.planBody')}>
              {ranked.slice(0, 3).map((p, i) => (
                <View key={p.id} style={{ gap: spacing[2] }}>
                  {i === 1 ? (
                    <Text variant="overline" color="textMuted">
                      {t('onboarding.otherPlans')}
                    </Text>
                  ) : null}
                  <PlanCard
                    testID={`recommended-${p.id}`}
                    title={p.title}
                    goal={t(`onboarding.goals.${p.goal}`)}
                    level={t(`plans.${p.level}`)}
                    weeks={p.weeks}
                    daysPerWeek={p.daysPerWeek}
                    minutesPerSession={p.minutesPerSession}
                    active={chosen === p.id}
                    onPress={() => setPlanId(p.id)}
                  />
                </View>
              ))}
            </Question>
          ) : null}
        </ScrollView>
      </Animated.View>

      <View
        style={{
          flexDirection: 'row',
          gap: spacing[3],
          paddingHorizontal: spacing[5],
          paddingTop: spacing[3],
          paddingBottom: insets.bottom + spacing[3],
          borderTopWidth: step === 'welcome' ? 0 : 1,
          borderTopColor: colors.border,
        }}
      >
        {step === 'welcome' ? (
          <View style={{ flex: 1, gap: spacing[2] }}>
            <Button
              testID="onboarding-start"
              label={t('onboarding.getStarted')}
              size="lg"
              fullWidth
              onPress={() => go(1)}
            />
            <Button
              testID="onboarding-sign-in"
              label={t('onboarding.haveAccount')}
              variant="ghost"
              fullWidth
              onPress={() => router.push('/auth/sign-in')}
            />
          </View>
        ) : (
          <>
            <Button
              testID="onboarding-back"
              label={t('onboarding.back')}
              variant="secondary"
              onPress={() => go(-1)}
            />
            <View style={{ flex: 1 }}>
              {step === 'plan' ? (
                <Button
                  testID="onboarding-finish"
                  label={saving ? t('onboarding.saving') : t('onboarding.startPlan')}
                  icon="checkmark"
                  fullWidth
                  loading={saving}
                  disabled={!canNext.plan}
                  onPress={() => void finish()}
                />
              ) : (
                <Button
                  testID="onboarding-next"
                  label={t('onboarding.next')}
                  icon="arrow-forward"
                  iconPosition="right"
                  fullWidth
                  disabled={!canNext[step]}
                  onPress={() => go(1)}
                />
              )}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function Question({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing[3] }}>
      <Text variant="displayM" accessibilityRole="header">
        {title}
      </Text>
      {hint ? (
        <Text variant="body" color="textMuted">
          {hint}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

function Welcome() {
  const { t } = useTranslation();
  const { colors, spacing, radii } = useTheme();
  const { reduceMotion } = useMotion();
  const float = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    float.set(
      withRepeat(
        withSequence(withTiming(-10, { duration: 1400 }), withTiming(0, { duration: 1400 })),
        -1,
      ),
    );
  }, [float, reduceMotion]);
  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: float.get() }] }));
  return (
    <View
      style={{ flex: 1, justifyContent: 'center', gap: spacing[5] }}
      testID="onboarding-welcome"
    >
      <Animated.View
        style={[
          {
            alignSelf: 'center',
            width: 140,
            height: 140,
            borderRadius: radii.xl,
            backgroundColor: colors.accentMuted,
            alignItems: 'center',
            justifyContent: 'center',
          },
          floatStyle,
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Icon name="body" size="xxl" color="accentText" />
      </Animated.View>
      <Text variant="displayL" accessibilityRole="header" align="center">
        {t('onboarding.welcomeTitle')}
      </Text>
      <Text variant="bodyL" color="textMuted" align="center">
        {t('onboarding.welcomeBody')}
      </Text>
    </View>
  );
}
