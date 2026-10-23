import NetInfo from '@react-native-community/netinfo';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { AppState, View } from 'react-native';

import { logger } from '@/core';
import { initData, onSyncComplete, syncNow } from '@/data';
import { authService } from '@/features/auth';
import { startSettingsSync } from '@/features/settings/settingsSync';
import { ErrorState, Skeleton, useTheme } from '@/ui';

export const queryClient = new QueryClient({
  defaultOptions: {
    // Data is local-first: queries read SQLite, so no network retries are needed.
    queries: { staleTime: 30_000, retry: false, networkMode: 'always' },
    mutations: { networkMode: 'always' },
  },
});

// TanStack Query follows real connectivity.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((s) =>
    setOnline(Boolean(s.isConnected && s.isInternetReachable !== false)),
  ),
);

const SYNC_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Boots the data layer (SQLite + migrations), restores auth, and keeps data in
 * sync: on start, when connectivity returns, when the app comes to the
 * foreground and every 5 minutes. Queries are invalidated after a sync pulls data.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const { colors, spacing } = useTheme();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await initData();
        await authService.init();
        if (!cancelled) setState('ready');
        void syncNow();
      } catch (e) {
        logger.error('Data layer failed to start', { error: String(e) });
        if (!cancelled) setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state !== 'ready') return;
    const stopSettings = startSettingsSync();
    const offSync = onSyncComplete((r) => {
      if (r.pulled > 0) void queryClient.invalidateQueries();
    });
    let wasOnline = true;
    const offNet = NetInfo.addEventListener((s) => {
      const online = Boolean(s.isConnected);
      if (online && !wasOnline) void syncNow();
      wasOnline = online;
    });
    const appState = AppState.addEventListener('change', (s) => {
      if (s === 'active') void syncNow();
    });
    const interval = setInterval(() => void syncNow(), SYNC_INTERVAL_MS);
    return () => {
      stopSettings();
      offSync();
      offNet();
      appState.remove();
      clearInterval(interval);
    };
  }, [state]);

  if (state === 'error') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.background }}>
        <ErrorState
          title="FormFit couldn't open its local database"
          message="Please restart the app."
        />
      </View>
    );
  }
  if (state === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: spacing[8],
          gap: spacing[3],
          backgroundColor: colors.background,
        }}
      >
        <Skeleton height={28} width="60%" />
        <Skeleton height={140} radius="lg" />
      </View>
    );
  }
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
