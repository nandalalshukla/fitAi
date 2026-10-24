import { logger } from '../logger';
import { scrub } from '../observability/scrub';
import type { Analytics, AnalyticsProps } from './types';

export interface HttpAnalyticsDeps {
  /** Project API key (public, write-only). */
  apiKey: string;
  /** e.g. https://eu.i.posthog.com */
  host: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
  /** Anonymous install id (random, never the account id or email). */
  distinctId: string;
  /** Flush when this many events are queued. */
  batchSize?: number;
}

interface QueuedEvent {
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

const MAX_QUEUE = 500;

/**
 * Minimal PostHog-compatible analytics over HTTPS (`POST {host}/batch/`), with no SDK and
 * no device fingerprinting. Events carry only the anonymous install id and coarse,
 * non-personal properties (scrubbed). Opt-out stops tracking and drops the queue.
 */
export class HttpAnalytics implements Analytics {
  private enabled = true;
  private queue: QueuedEvent[] = [];
  private flushing: Promise<void> | null = null;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => Date;
  private distinctId: string;

  constructor(private readonly deps: HttpAnalyticsDeps) {
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.now = deps.now ?? (() => new Date());
    this.distinctId = deps.distinctId;
  }

  track(event: string, props?: AnalyticsProps): void {
    if (!this.enabled) return;
    this.queue.push({
      event,
      properties: { ...scrub(props ?? {}), distinct_id: this.distinctId, $lib: 'formfit' },
      timestamp: this.now().toISOString(),
    });
    if (this.queue.length > MAX_QUEUE) this.queue.splice(0, this.queue.length - MAX_QUEUE);
    if (this.queue.length >= (this.deps.batchSize ?? 20)) void this.flush();
  }

  screen(name: string, props?: AnalyticsProps): void {
    this.track('$screen', { ...props, $screen_name: name });
  }

  identify(anonymousId: string): void {
    this.distinctId = anonymousId;
  }

  reset(): void {
    this.queue = [];
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.queue = [];
  }

  get pending(): number {
    return this.queue.length;
  }

  /** Sends queued events; failed batches are re-queued for the next attempt. */
  flush(): Promise<void> {
    if (this.flushing) return this.flushing;
    if (!this.enabled || this.queue.length === 0) return Promise.resolve();
    const batch = this.queue.splice(0, this.queue.length);
    this.flushing = this.fetchImpl(`${this.deps.host.replace(/\/$/, '')}/batch/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: this.deps.apiKey, batch }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      })
      .catch((e: unknown) => {
        if (this.enabled) this.queue.unshift(...batch.slice(-MAX_QUEUE));
        logger.debug('Analytics flush failed', { error: String(e) });
      })
      .finally(() => {
        this.flushing = null;
      });
    return this.flushing;
  }
}
