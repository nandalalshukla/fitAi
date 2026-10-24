import { z } from 'zod';

/**
 * Public (client-side) environment. Only `EXPO_PUBLIC_*` variables are inlined
 * into the bundle by Expo, and each must be referenced literally (no dynamic
 * access) for inlining to work. Secrets must NEVER be read here.
 * See `.env.example` for documentation of every variable.
 */
/** Outside development, network endpoints must use HTTPS. */
const secureUrl = z
  .url()
  .refine((u) => __DEV__ || u.startsWith('https://'), { message: 'must use https' });

const schema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: secureUrl.optional(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  EXPO_PUBLIC_SENTRY_DSN: z.url().optional(),
  EXPO_PUBLIC_ANALYTICS_KEY: z.string().min(1).optional(),
  EXPO_PUBLIC_ANALYTICS_HOST: secureUrl.optional(),
  /** OAuth client IDs are public identifiers (not secrets). */
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z.string().min(1).optional(),
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: z.string().min(1).optional(),
  /** Public support address for "Help & feedback" (hidden when unset). */
  EXPO_PUBLIC_SUPPORT_EMAIL: z.email().optional(),
  /** Hosted legal documents (required by the app stores); linked from the in-app summaries. */
  EXPO_PUBLIC_PRIVACY_URL: secureUrl.optional(),
  EXPO_PUBLIC_TERMS_URL: secureUrl.optional(),
});

export type PublicEnv = z.infer<typeof schema>;

const blankToUndefined = (v: string | undefined) => (v && v.trim().length > 0 ? v : undefined);

export function parseEnv(raw: Record<string, string | undefined>): PublicEnv {
  const cleaned = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, blankToUndefined(v)]));
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    // Fail loudly in dev; in production fall back to "feature disabled" behaviour.
    const message = `Invalid environment: ${result.error.issues.map((i) => i.path.join('.')).join(', ')}`;
    if (__DEV__) throw new Error(message);
    return {};
  }
  return result.data;
}

export const env: PublicEnv = parseEnv({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
  EXPO_PUBLIC_ANALYTICS_KEY: process.env.EXPO_PUBLIC_ANALYTICS_KEY,
  EXPO_PUBLIC_ANALYTICS_HOST: process.env.EXPO_PUBLIC_ANALYTICS_HOST,
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  EXPO_PUBLIC_SUPPORT_EMAIL: process.env.EXPO_PUBLIC_SUPPORT_EMAIL,
  EXPO_PUBLIC_PRIVACY_URL: process.env.EXPO_PUBLIC_PRIVACY_URL,
  EXPO_PUBLIC_TERMS_URL: process.env.EXPO_PUBLIC_TERMS_URL,
});

export const isBackendConfigured = (e: PublicEnv = env) =>
  Boolean(e.EXPO_PUBLIC_SUPABASE_URL && e.EXPO_PUBLIC_SUPABASE_ANON_KEY);
