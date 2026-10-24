/**
 * Privacy scrubbing for anything that leaves the device (crash reports, analytics).
 * Removes keys that may hold personal data or secrets and redacts email addresses
 * and long tokens inside strings. Pure and unit-tested.
 */
const SENSITIVE_KEY = /email|token|password|secret|otp|authorization|cookie|session|phone|address/i;
/** Keys that are only sensitive as a whole word (`name`, not `$screen_name`). */
const SENSITIVE_EXACT = new Set([
  'name',
  'displayname',
  'fullname',
  'firstname',
  'lastname',
  'code',
]);
const isSensitive = (k: string) => SENSITIVE_KEY.test(k) || SENSITIVE_EXACT.has(k.toLowerCase());
const EMAIL = /[^\s@"']+@[^\s@"']+\.[^\s@"']+/g;
const LONG_TOKEN = /\b[A-Za-z0-9_-]{32,}\b/g;

export function scrubString(s: string): string {
  return s.replace(EMAIL, '[email]').replace(LONG_TOKEN, '[redacted]');
}

export function scrub<T>(value: T, depth = 0): T {
  if (depth > 6) return '[deep]' as T;
  if (typeof value === 'string') return scrubString(value) as T;
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>))
      out[k] = isSensitive(k) ? '[redacted]' : scrub(v, depth + 1);
    return out as T;
  }
  return value;
}
