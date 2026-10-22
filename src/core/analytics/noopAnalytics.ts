import { logger } from '../logger';
import type { Analytics } from './types';

/** Default implementation: logs in dev, does nothing in production. */
export class NoopAnalytics implements Analytics {
  private enabled = true;

  track(event: string, props?: Record<string, unknown>) {
    if (this.enabled) logger.debug(`analytics.track ${event}`, props);
  }

  screen(name: string) {
    if (this.enabled) logger.debug(`analytics.screen ${name}`);
  }

  identify() {}

  reset() {}

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}
