/** RFC 4122 v4 UUID (client-generated ids make offline writes idempotent). */
export function newId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Fallback: expo-crypto installs getRandomValues on native.
  const b = new Uint8Array(16);
  (
    globalThis as unknown as { crypto: { getRandomValues: (a: Uint8Array) => Uint8Array } }
  ).crypto.getRandomValues(b);
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export type Clock = () => Date;
export const systemClock: Clock = () => new Date();
