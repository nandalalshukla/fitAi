import '@/i18n';

import {
  BarlowCondensed_600SemiBold,
  BarlowCondensed_700Bold,
  BarlowCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-condensed';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
  SplashScreen,
  Stack,
  usePathname,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { bootstrapObservability, getService } from '@/core';
import { AppErrorBoundary } from '@/features/shell/AppErrorBoundary';
import { DataProvider } from '@/features/shell/DataProvider';
import { OfflineBanner } from '@/features/shell/OfflineBanner';
import { ThemeProvider, ToastProvider, useTheme } from '@/ui';

void SplashScreen.preventAutoHideAsync();
bootstrapObservability();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    BarlowCondensed_600SemiBold,
    BarlowCondensed_700Bold,
    BarlowCondensed_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const ready = fontsLoaded || Boolean(fontError);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppErrorBoundary>
            <ToastProvider>
              <DataProvider>
                <AppNavigator />
              </DataProvider>
              <OfflineBanner />
            </ToastProvider>
          </AppErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppNavigator() {
  const theme = useTheme();
  const { colors } = theme;

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  // Screen analytics: route patterns only (no query params or ids beyond content slugs).
  const pathname = usePathname();
  useEffect(() => {
    getService('analytics').screen(pathname);
  }, [pathname]);

  const navTheme = useMemo(() => {
    const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.accent,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.ember,
      },
    };
  }, [theme.scheme, colors]);

  return (
    <NavigationThemeProvider value={navTheme}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
          animationDuration: theme.motion.durations.slow,
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="exercise/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="legal/[doc]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="plan/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="workout/index"
          options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen
          name="workout/summary"
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen
          name="auth/sign-in"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="dev/design-system" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="dev/animations" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen
          name="dev/pose-lab"
          options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }}
        />
      </Stack>
    </NavigationThemeProvider>
  );
}
