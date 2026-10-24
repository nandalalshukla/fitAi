import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { AppState } from 'react-native';

import { HttpAnalytics } from './analytics/httpAnalytics';
import { env } from './env';
import { initCrashReporting } from './observability/crashReporting';
import { registerServices } from './services';
import { kv } from './storage';

const INSTALL_ID_KEY = 'install.id';
const FLUSH_INTERVAL_MS = 30_000;
let booted = false;

/** Random per-install id for anonymous analytics (reset by reinstalling; never the account id). */
export function installId(): string {
  let id = kv.getString(INSTALL_ID_KEY);
  if (!id) {
    id = Crypto.randomUUID();
    kv.set(INSTALL_ID_KEY, id);
  }
  return id;
}

/**
 * Wires crash reporting (Sentry) and analytics when their public keys are configured.
 * Without keys the app uses the no-op implementations: nothing leaves the device.
 */
export function bootstrapObservability(): void {
  if (booted) return;
  booted = true;
  const extra = Constants.expoConfig?.extra as { appVariant?: string } | undefined;
  initCrashReporting({
    dsn: env.EXPO_PUBLIC_SENTRY_DSN,
    environment: extra?.appVariant ?? (__DEV__ ? 'development' : 'production'),
    release: Constants.expoConfig?.version,
  });
  if (env.EXPO_PUBLIC_ANALYTICS_KEY && env.EXPO_PUBLIC_ANALYTICS_HOST) {
    const analytics = new HttpAnalytics({
      apiKey: env.EXPO_PUBLIC_ANALYTICS_KEY,
      host: env.EXPO_PUBLIC_ANALYTICS_HOST,
      distinctId: installId(),
    });
    registerServices({ analytics });
    setInterval(() => void analytics.flush(), FLUSH_INTERVAL_MS);
    AppState.addEventListener('change', (s) => {
      if (s !== 'active') void analytics.flush();
    });
  }
}
