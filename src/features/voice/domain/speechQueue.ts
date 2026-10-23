import type { Utterance } from './types';

/**
 * Priority speech queue (pure; clock passed in). Guarantees:
 * - one utterance at a time (the coach pulls `next()` only when idle),
 * - highest priority first, FIFO within a priority,
 * - per-key cooldown (the same cue is not repeated within its window),
 * - coalescing (a newer rep count replaces a queued older one),
 * - expiry (stale cues are dropped instead of being spoken late),
 * - bounded length (lowest-priority items are dropped first).
 */
export class SpeechQueue {
  private items: Utterance[] = [];
  private lastSpoken = new Map<string, number>();

  constructor(private readonly maxLength = 6) {}

  get size(): number {
    return this.items.length;
  }

  /** Returns false if the utterance was rejected (cooldown). */
  enqueue(u: Utterance, now: number): boolean {
    const last = this.lastSpoken.get(u.key);
    if (last !== undefined && now - last < u.cooldownMs) return false;
    if (this.items.some((i) => i.key === u.key && i.coalesceKey === undefined)) return false; // already pending
    if (u.coalesceKey !== undefined)
      this.items = this.items.filter((i) => i.coalesceKey !== u.coalesceKey);
    this.items.push(u);
    if (this.items.length > this.maxLength) {
      // Drop the lowest-priority, oldest item.
      let worst = 0;
      this.items.forEach((it, idx) => {
        const w = this.items[worst]!;
        if (it.priority < w.priority || (it.priority === w.priority && it.createdAt < w.createdAt))
          worst = idx;
      });
      this.items.splice(worst, 1);
    }
    return this.items.includes(u);
  }

  /** Highest-priority non-expired utterance (removed from the queue), or null. */
  next(now: number): Utterance | null {
    this.items = this.items.filter((i) => i.expiresAt > now);
    if (this.items.length === 0) return null;
    let best = 0;
    this.items.forEach((it, idx) => {
      const b = this.items[best]!;
      if (it.priority > b.priority || (it.priority === b.priority && it.createdAt < b.createdAt))
        best = idx;
    });
    const [u] = this.items.splice(best, 1);
    return u ?? null;
  }

  /** Highest pending priority (for interrupt decisions). */
  peekPriority(now: number): number {
    let p = -Infinity;
    for (const i of this.items) if (i.expiresAt > now && i.priority > p) p = i.priority;
    return p;
  }

  markSpoken(key: string, now: number): void {
    this.lastSpoken.set(key, now);
  }

  clear(): void {
    this.items = [];
  }

  /** Forget cooldowns too (new workout). */
  reset(): void {
    this.items = [];
    this.lastSpoken.clear();
  }
}
