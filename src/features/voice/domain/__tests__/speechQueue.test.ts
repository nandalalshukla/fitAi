import { SpeechQueue } from '../speechQueue';
import type { Utterance } from '../types';

const u = (
  key: string,
  priority: number,
  t: number,
  extra: Partial<Utterance> = {},
): Utterance => ({
  key,
  text: key,
  priority,
  createdAt: t,
  expiresAt: t + 3000,
  cooldownMs: 4500,
  ...extra,
});

describe('SpeechQueue', () => {
  it('returns the highest priority first, FIFO within a priority', () => {
    const q = new SpeechQueue();
    q.enqueue(u('enc', 20, 0), 0);
    q.enqueue(u('count', 60, 1), 1);
    q.enqueue(u('formA', 80, 2), 2);
    q.enqueue(u('formB', 80, 3), 3);
    expect([q.next(4), q.next(4), q.next(4), q.next(4)].map((x) => x?.key)).toEqual([
      'formA',
      'formB',
      'count',
      'enc',
    ]);
    expect(q.next(4)).toBeNull();
  });

  it('enforces per-cue cooldown after speaking', () => {
    const q = new SpeechQueue();
    q.markSpoken('chestUp', 1000);
    expect(q.enqueue(u('chestUp', 80, 2000), 2000)).toBe(false);
    expect(q.enqueue(u('chestUp', 80, 5600), 5600)).toBe(true);
  });

  it('does not queue the same cue twice', () => {
    const q = new SpeechQueue();
    expect(q.enqueue(u('chestUp', 80, 0, { cooldownMs: 0 }), 0)).toBe(true);
    expect(q.enqueue(u('chestUp', 80, 10, { cooldownMs: 0 }), 10)).toBe(false);
    expect(q.size).toBe(1);
  });

  it('coalesces rep counts: only the latest is kept', () => {
    const q = new SpeechQueue();
    q.enqueue(u('count:4', 60, 0, { coalesceKey: 'count', cooldownMs: 0 }), 0);
    q.enqueue(u('count:5', 60, 10, { coalesceKey: 'count', cooldownMs: 0 }), 10);
    expect(q.size).toBe(1);
    expect(q.next(20)?.key).toBe('count:5');
  });

  it('drops stale utterances', () => {
    const q = new SpeechQueue();
    q.enqueue(u('count', 60, 0, { expiresAt: 1500 }), 0);
    expect(q.next(1600)).toBeNull();
  });

  it('is bounded: lowest priority is dropped when full', () => {
    const q = new SpeechQueue(3);
    q.enqueue(u('a', 50, 0), 0);
    q.enqueue(u('enc', 10, 1), 1);
    q.enqueue(u('b', 50, 2), 2);
    q.enqueue(u('c', 90, 3), 3);
    expect(q.size).toBe(3);
    const keys = [q.next(4), q.next(4), q.next(4)].map((x) => x?.key);
    expect(keys).not.toContain('enc');
  });
});
