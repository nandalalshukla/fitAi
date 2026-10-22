import { NoopAnalytics, type Analytics } from './analytics';

/**
 * Minimal service locator. Features depend on interfaces; concrete
 * implementations are registered once at startup (and swapped for fakes in tests).
 * New services (PoseEstimator, SpeechService, repositories) are added to this map
 * as they are introduced.
 */
export interface Services {
  analytics: Analytics;
}

const defaults = (): Services => ({
  analytics: new NoopAnalytics(),
});

let current: Services = defaults();

export function getService<K extends keyof Services>(key: K): Services[K] {
  return current[key];
}

export function registerServices(overrides: Partial<Services>) {
  current = { ...current, ...overrides };
}

export function resetServices() {
  current = defaults();
}
