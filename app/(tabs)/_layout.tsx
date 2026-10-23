import { Redirect, Tabs } from 'expo-router';
import { View } from 'react-native';

import { useProfileQuery } from '@/data';
import { useUserId } from '@/features/auth';
import { AnimatedTabBar } from '@/features/shell/AnimatedTabBar';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/ui';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors, motion } = useTheme();
  const userId = useUserId();
  const profile = useProfileQuery(userId);

  // First run (or signed out): onboarding creates the guest/profile and starts a plan.
  if (!userId) return <Redirect href="/onboarding" />;
  if (profile.isLoading) return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  if (!profile.data?.onboardingCompletedAt) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        transitionSpec: { animation: 'timing', config: { duration: motion.durations.fast } },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.today') }} />
      <Tabs.Screen name="plans" options={{ title: t('tabs.plans') }} />
      <Tabs.Screen name="exercises" options={{ title: t('tabs.exercises') }} />
      <Tabs.Screen name="progress" options={{ title: t('tabs.progress') }} />
      <Tabs.Screen name="settings" options={{ title: t('tabs.settings') }} />
    </Tabs>
  );
}
