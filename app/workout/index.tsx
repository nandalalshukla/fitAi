import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useVoiceCoach } from '@/features/voice';
import { useTranslation } from '@/i18n';
import {
  AnimatedCounter,
  Button,
  Countdown,
  PressableScale,
  ProgressRing,
  Text,
  haptics,
  useTheme,
} from '@/ui';

/**
 * Workout player shell. Demonstrates the hands-free layout + core animations
 * (countdown, rep pop, set ring). Camera/pose pipeline is wired in Phase 2.
 */
export default function WorkoutScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<'countdown' | 'active'>('countdown');
  const [reps, setReps] = useState(0);
  const coach = useVoiceCoach();
  const target = 20;

  return (
    <View
      testID="workout-screen"
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + spacing[4],
        paddingBottom: insets.bottom + spacing[4],
        paddingHorizontal: spacing[5],
        justifyContent: 'space-between',
      }}
    >
      <View>
        <Text variant="overline" color="textMuted">
          Set 1 / 3
        </Text>
        <Text variant="displayM">Push-up</Text>
      </View>

      <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        {phase === 'countdown' ? (
          <Countdown
            onTick={(n) =>
              coach.say({ id: 'countdown', textKey: 'voice.countdown', params: { count: n } })
            }
            onDone={() => {
              coach.say({ id: 'go', textKey: 'voice.go' });
              setPhase('active');
            }}
          />
        ) : (
          <PressableScale
            testID="rep-tap"
            haptic={null}
            accessibilityLabel="Add a rep"
            onPress={() => {
              haptics.rep();
              const next = Math.min(target, reps + 1);
              setReps(next);
              coach.handleEngineEvents(
                [
                  {
                    type: 'rep',
                    t: Date.now(),
                    reps: next,
                    quality: 100,
                    durationMs: 2000,
                    tooFast: false,
                    violations: [],
                  },
                ],
                { targetReps: target, avgRepMs: 2000 },
              );
            }}
          >
            <ProgressRing progress={reps / target} size={280} strokeWidth={14} gradient>
              <AnimatedCounter value={reps} accessibilityLabel={`${reps} of ${target} reps`} />
              <Text variant="h3" color="textMuted">
                / {target}
              </Text>
            </ProgressRing>
          </PressableScale>
        )}
        <Text variant="body" color="textMuted" align="center" style={{ marginTop: spacing[6] }}>
          {t('workout.placeholder')}
        </Text>
      </View>

      <Button
        testID="end-workout"
        label={t('workout.exit')}
        variant="secondary"
        fullWidth
        onPress={() => router.back()}
      />
    </View>
  );
}
