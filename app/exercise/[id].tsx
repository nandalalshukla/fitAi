import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { getExerciseInfo, type ExerciseInfo } from '@/content';
import { ExerciseDemo, hasDemo } from '@/features/exercises';
import { useLooseT, useTranslation } from '@/i18n';
import {
  Card,
  Chip,
  ErrorState,
  Icon,
  PressableScale,
  Screen,
  SectionHeader,
  Stagger,
  Text,
  useMotion,
  useTheme,
  type IconName,
} from '@/ui';

/** Exercise guide: animated demo, numbered steps, cues, mistakes, variations, camera placement. */
export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const lt = useLooseT();
  const { spacing, colors, hitTarget, radii } = useTheme();
  const info = id ? getExerciseInfo(id) : undefined;

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

  if (!info) {
    return (
      <Screen>
        {back}
        <ErrorState
          title={t('exercises.notFound')}
          retryLabel={t('common.close')}
          onRetry={() => router.back()}
        />
      </Screen>
    );
  }

  const muscle = (m: string) => lt(`exercises.muscleNames.${m}`);

  return (
    <Screen testID="exercise-detail-screen">
      {back}
      <Stagger index={0}>
        <Text variant="overline" color="accentText">
          {t(`exercises.categories.${info.category}`)} · {t(`plans.${info.difficulty}`)}
          {info.tracked ? ` · ${t('exercises.tracked')}` : ''}
        </Text>
        <Text variant="displayL" accessibilityRole="header">
          {info.name}
        </Text>
        <Text variant="body" color="textMuted">
          {info.summary}
        </Text>
      </Stagger>

      <Stagger index={1}>
        <DemoPanel info={info} />
      </Stagger>

      <Section title={t('exercises.howTo')}>
        {info.steps.map((step, i) => (
          <View
            key={step}
            style={{ flexDirection: 'row', gap: spacing[3] }}
            accessible
            accessibilityLabel={`${t('exercises.step', { n: i + 1 })}. ${step}`}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: radii.pill,
                backgroundColor: colors.accentMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text variant="label" color="accentText">
                {i + 1}
              </Text>
            </View>
            <Text variant="body" style={{ flex: 1 }}>
              {step}
            </Text>
          </View>
        ))}
      </Section>

      {info.formCues.length > 0 || info.tips.length > 0 ? (
        <Section title={t('exercises.formCues')}>
          {info.formCues.map((c) => (
            <Bullet key={c} icon="megaphone-outline" text={lt(c)} strong />
          ))}
          {info.tips.map((tip) => (
            <Bullet key={tip} icon="bulb-outline" text={tip} />
          ))}
        </Section>
      ) : null}

      <Section title={t('exercises.mistakes')}>
        {info.mistakes.map((m) => (
          <View key={m.mistake} style={{ gap: spacing[1] }}>
            <Bullet icon="close-circle-outline" iconColor="dangerText" text={m.mistake} strong />
            <Bullet
              icon="checkmark-circle-outline"
              iconColor="successText"
              text={`${t('exercises.fix')}: ${m.fix}`}
            />
          </View>
        ))}
      </Section>

      {info.easier.length > 0 || info.harder.length > 0 ? (
        <Section title={`${t('exercises.easier')} / ${t('exercises.harder')}`}>
          {info.easier.map((v) => (
            <Variation
              key={v.name}
              icon="arrow-down-circle-outline"
              name={v.name}
              exerciseId={v.exerciseId}
            />
          ))}
          {info.harder.map((v) => (
            <Variation
              key={v.name}
              icon="arrow-up-circle-outline"
              name={v.name}
              exerciseId={v.exerciseId}
            />
          ))}
        </Section>
      ) : null}

      <Section title={t('exercises.muscles')}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
          {info.primaryMuscles.map((m) => (
            <Chip key={m} label={muscle(m)} selected />
          ))}
          {info.secondaryMuscles.map((m) => (
            <Chip key={m} label={muscle(m)} />
          ))}
        </View>
      </Section>

      <Section title={t('exercises.camera')}>
        <Bullet icon="phone-portrait-outline" text={info.camera} />
      </Section>

      {info.safety.length > 0 ? (
        <Section title={t('exercises.safety')}>
          {info.safety.map((s) => (
            <Bullet key={s} icon="medkit-outline" iconColor="warningText" text={s} />
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}

function DemoPanel({ info }: { info: ExerciseInfo }) {
  const { t } = useTranslation();
  const { spacing, colors, radii } = useTheme();
  const { reduceMotion } = useMotion();
  const { width } = useWindowDimensions();
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<0.5 | 1>(1);
  const [view, setView] = useState<'side' | 'front' | null>(null);
  const size = Math.min(width - spacing[5] * 2, 420);

  if (!hasDemo(info.id)) {
    return (
      <Card>
        <View style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'center' }}>
          <Icon name="body-outline" size="xl" color="textSubtle" />
          <Text variant="body" color="textMuted" style={{ flex: 1 }}>
            {t('exercises.noDemo')}
          </Text>
        </View>
      </Card>
    );
  }
  return (
    <View style={{ gap: spacing[2] }}>
      <View
        style={{
          borderRadius: radii.xl,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        }}
      >
        <ExerciseDemo
          exercise={info.id}
          width={size}
          height={size * 0.75}
          playing={playing}
          speed={speed}
          yawDeg={view === null ? undefined : view === 'side' ? 90 : 0}
          accessibilityLabel={t('exercises.demo', { name: info.name })}
        />
      </View>
      {reduceMotion ? null : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
          <Chip
            testID="demo-play"
            icon={playing ? 'pause' : 'play'}
            label={playing ? t('exercises.pause') : t('exercises.play')}
            onPress={() => setPlaying((p) => !p)}
          />
          <Chip
            testID="demo-speed"
            label={t('exercises.speed', { speed: speed === 1 ? 0.5 : 1 })}
            onPress={() => setSpeed((s) => (s === 1 ? 0.5 : 1))}
          />
          <Chip
            label={t('exercises.sideView')}
            selected={view === 'side'}
            onPress={() => setView('side')}
          />
          <Chip
            label={t('exercises.frontView')}
            selected={view === 'front'}
            onPress={() => setView('front')}
          />
        </View>
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View style={{ gap: spacing[3] }}>
      <SectionHeader title={title} />
      {children}
    </View>
  );
}

function Bullet({
  icon,
  text,
  iconColor = 'accentText',
  strong = false,
}: {
  icon: IconName;
  text: string;
  iconColor?: 'accentText' | 'dangerText' | 'successText' | 'warningText';
  strong?: boolean;
}) {
  const { spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing[2] }}>
      <Icon name={icon} size="md" color={iconColor} />
      <Text variant={strong ? 'bodyStrong' : 'body'} style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

function Variation({
  icon,
  name,
  exerciseId,
}: {
  icon: IconName;
  name: string;
  exerciseId?: string;
}) {
  const { spacing } = useTheme();
  const content = (
    <View style={{ flexDirection: 'row', gap: spacing[2], alignItems: 'center' }}>
      <Icon name={icon} size="md" color="accentText" />
      <Text variant="body" color={exerciseId ? 'accentText' : 'text'} style={{ flex: 1 }}>
        {name}
      </Text>
      {exerciseId ? <Icon name="chevron-forward" size="md" color="textSubtle" /> : null}
    </View>
  );
  return exerciseId ? (
    <PressableScale
      accessibilityRole="link"
      accessibilityLabel={name}
      onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exerciseId } })}
    >
      {content}
    </PressableScale>
  ) : (
    content
  );
}
