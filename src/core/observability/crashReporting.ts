import * as Sentry from '@sentry/react-native';

import { logger, type LogSink } from '../logger';
import { scrub, scrubString } from './scrub';

/**
 * Crash reporting (Sentry). Off unless a DSN is configured; respects the user's
 * "share anonymous usage data" opt-out at runtime. Never sends PII: default PII is
 * disabled, user/email fields are dropped, and every event, breadcrumb and log
 * context is scrubbed (see scrub.ts). Camera frames never reach this layer.
 */
let enabled = true;
let initialised = false;

export interface CrashReportingOptions {
  dsn: string | undefined;
  environment: string;
  release?: string;
}

export function initCrashReporting({ dsn, environment, release }: CrashReportingOptions): boolean {
  if (!dsn || initialised) return initialised;
  Sentry.init({
    dsn,
    environment,
    release,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    tracesSampleRate: environment === 'production' ? 0.1 : 1,
    beforeSend(event) {
      if (!enabled) return null;
      delete event.user;
      delete event.request;
      if (event.message) event.message = scrubString(event.message);
      if (event.extra) event.extra = scrub(event.extra);
      if (event.contexts) event.contexts = scrub(event.contexts);
      for (const ex of event.exception?.values ?? [])
        if (ex.value) ex.value = scrubString(ex.value);
      return event;
    },
    beforeBreadcrumb(crumb) {
      if (!enabled) return null;
      // Console breadcrumbs duplicate our logger sink and may contain raw objects.
      if (crumb.category === 'console') return null;
      if (crumb.message) crumb.message = scrubString(crumb.message);
      if (crumb.data) crumb.data = scrub(crumb.data);
      return crumb;
    },
  });
  initialised = true;
  logger.addSink(sentrySink);
  return true;
}

export function setCrashReportingEnabled(on: boolean): void {
  enabled = on;
}

/** Logger → Sentry: info/warn become breadcrumbs, errors become events. */
export const sentrySink: LogSink = {
  log(level, message, context) {
    if (!enabled || !initialised) return;
    const data = context ? scrub(context) : undefined;
    if (level === 'error') {
      const err = context?.error instanceof Error ? context.error : null;
      if (err) Sentry.captureException(err, { extra: data });
      else Sentry.captureMessage(scrubString(message), { level: 'error', extra: data });
    } else if (level !== 'debug') {
      Sentry.addBreadcrumb({
        category: 'app',
        level: level === 'warn' ? 'warning' : 'info',
        message: scrubString(message),
        data,
      });
    }
  },
};

export { Sentry };
