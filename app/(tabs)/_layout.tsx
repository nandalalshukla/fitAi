import { Tabs } from 'expo-router';

import { AnimatedTabBar } from '@/features/shell/AnimatedTabBar';
import { useTranslation } from '@/i18n';
import { useTheme } from '@/ui';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors, motion } = useTheme();
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
