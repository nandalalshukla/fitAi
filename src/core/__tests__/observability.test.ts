import * as Sentry from '@sentry/react-native';

import { HttpAnalytics } from '../analytics/httpAnalytics';
import { logger } from '../logger';
import { initCrashReporting, setCrashReportingEnabled } from '../observability/crashReporting';
import { scrub, scrubString } from '../observability/scrub';

describe('scrub', () => {
  it('redacts sensitive keys, emails and long tokens, recursively', () => {
    expect(
      scrub({
        email: 'a@b.co',
        plan: 'six_pack_abs',
        nested: { access_token: 'x', note: 'contact me at jo@example.com' },
        list: ['eyJhbGciOiJIUzI1NiJ9abcdefghijklmnopqrstuvwxyz', 3],
      }),
    ).toEqual({
      email: '[redacted]',
      plan: 'six_pack_abs',
      nested: { access_token: '[redacted]', note: 'contact me at [email]' },
      list: ['[redacted]', 3],
    });
    expect(scrubString('user jo@example.com failed')).toBe('user [email] failed');
  });
});

describe('HttpAnalytics', () => {
  const make = (fetchImpl: jest.Mock) =>
    new HttpAnalytics({
      apiKey: 'phc_key',
      host: 'https://eu.i.posthog.com/',
      distinctId: 'install-1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      now: () => new Date('2026-10-24T10:00:00Z'),
      batchSize: 3,
    });

  it('batches events with the anonymous id and scrubbed props', async () => {
    const fetchImpl = jest.fn(async () => ({ ok: true }));
    const a = make(fetchImpl);
    a.track('workout_finished', { sets: 3, email: 'x@y.z' } as never);
    a.screen('/plans');
    expect(fetchImpl).not.toHaveBeenCalled();
    a.track('plan_enrolled', { plan: 'core_posture' });
    await a.flush();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, { body: string }];
    expect(url).toBe('https://eu.i.posthog.com/batch/');
    const body = JSON.parse(init.body);
    expect(body.api_key).toBe('phc_key');
    expect(body.batch).toHaveLength(3);
    expect(body.batch[0]).toEqual({
      event: 'workout_finished',
      properties: { sets: 3, email: '[redacted]', distinct_id: 'install-1', $lib: 'formfit' },
      timestamp: '2026-10-24T10:00:00.000Z',
    });
    expect(body.batch[1].properties.$screen_name).toBe('/plans');
  });

  it('re-queues a failed batch and drops everything when the user opts out', async () => {
    const fetchImpl = jest.fn(async () => ({ ok: false, status: 503 }));
    const a = make(fetchImpl);
    a.track('data_exported', {});
    await a.flush();
    expect(a.pending).toBe(1);
    a.setEnabled(false);
    expect(a.pending).toBe(0);
    a.track('data_exported', {});
    expect(a.pending).toBe(0);
  });
});

describe('crash reporting', () => {
  it('is off without a DSN, and scrubs / respects opt-out when on', () => {
    expect(initCrashReporting({ dsn: undefined, environment: 'test' })).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(initCrashReporting({ dsn: 'https://k@o.ingest.sentry.io/1', environment: 'test' })).toBe(
      true,
    );
    const opts = (Sentry.init as jest.Mock).mock.calls[0][0];
    expect(opts.sendDefaultPii).toBe(false);
    expect(opts.attachScreenshot).toBe(false);

    const event = opts.beforeSend({
      message: 'failed for jo@example.com',
      user: { email: 'jo@example.com' },
      extra: { token: 'abc', day: 3 },
    });
    expect(event).toEqual({
      message: 'failed for [email]',
      extra: { token: '[redacted]', day: 3 },
    });

    logger.error('Boom', { error: new Error('x') });
    expect(Sentry.captureException).toHaveBeenCalled();

    setCrashReportingEnabled(false);
    expect(opts.beforeSend({ message: 'x' })).toBeNull();
    setCrashReportingEnabled(true);
  });
});
