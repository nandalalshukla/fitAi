# Environment values — where to get them, where they go

Every value is optional; a missing value disables its feature (the app runs fully offline as a
guest with none). **Public** = `EXPO_PUBLIC_*`, bundled into the app. **Secret** = never bundled.

| Variable                                                                        | Kind         | Where it goes                                                            |
| ------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------ |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`                     | Public       | `.env`, EAS env (all profiles)                                           |
| `SUPABASE_PROJECT_ID`, `SUPABASE_ACCESS_TOKEN`                                  | Secret       | `.env` (CLI), GitHub secret if migrations run in CI                      |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`          | Public       | `.env`, EAS env                                                          |
| `GOOGLE_IOS_URL_SCHEME`                                                         | Build config | `.env`, EAS env                                                          |
| `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_WEB_CLIENT_SECRET`                              | Secret       | Supabase dashboard (Google provider); `.env` for the local stack         |
| `APPLE_SERVICES_ID`, `APPLE_SIGNIN_SECRET`                                      | Secret       | Supabase dashboard (Apple provider) — only for web/Android Apple sign-in |
| `APPLE_TEAM_ID`                                                                 | Secret       | EAS credentials / `eas.json` submit config                               |
| `EXPO_PUBLIC_SENTRY_DSN`                                                        | Public       | `.env`, EAS env                                                          |
| `SENTRY_ORG`, `SENTRY_PROJECT`                                                  | Build config | EAS env                                                                  |
| `SENTRY_AUTH_TOKEN`                                                             | Secret       | EAS env with `--visibility secret` only                                  |
| `EXPO_PUBLIC_ANALYTICS_KEY`, `EXPO_PUBLIC_ANALYTICS_HOST`                       | Public       | `.env`, EAS env                                                          |
| `EXPO_PUBLIC_SUPPORT_EMAIL`, `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL` | Public       | `.env`, EAS env                                                          |
| `APP_BUNDLE_ID`, `EAS_PROJECT_ID`                                               | Build config | `.env`, EAS env                                                          |
| `EXPO_TOKEN`                                                                    | Secret       | GitHub → Settings → Secrets and variables → Actions                      |

## How to get each value

### Supabase (backend, accounts, sync)

1. Create a project at https://supabase.com/dashboard (pick the region closest to your users).
2. **Project Settings → API**: copy _Project URL_ → `EXPO_PUBLIC_SUPABASE_URL`, _anon public_ key →
   `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The subdomain of the URL is `SUPABASE_PROJECT_ID`.
3. **Account → Access Tokens → Generate** → `SUPABASE_ACCESS_TOKEN` (for the CLI).
4. **Authentication → Providers**: enable _Anonymous sign-ins_ and _Email_ (OTP). In
   **Authentication → Email Templates → Magic Link**, include `{{ .Token }}` so users get a 6-digit code.

### Google Sign-In

1. https://console.cloud.google.com → create/select a project → **APIs & Services → OAuth consent
   screen** (External, app name FormFit, support email, privacy URL).
2. **Credentials → Create credentials → OAuth client ID**:
   - _Web application_ → client ID = `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` = `GOOGLE_WEB_CLIENT_ID`,
     secret = `GOOGLE_WEB_CLIENT_SECRET`.
   - _iOS_ (bundle id `com.formfit.app`) → client ID = `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`; its
     _iOS URL scheme_ (reversed client ID) = `GOOGLE_IOS_URL_SCHEME`.
   - _Android_ (package `com.formfit.app`, SHA-1 from `eas credentials`) — no value needed in the app.
3. Supabase → **Authentication → Providers → Google**: enable, paste the web client ID and secret,
   and add the iOS client ID to _Authorized Client IDs_.

### Sign in with Apple

1. https://developer.apple.com → **Certificates, IDs & Profiles → Identifiers** → App ID
   `com.formfit.app` → enable _Sign in with Apple_. Your Team ID (top right / Membership) = `APPLE_TEAM_ID`.
2. Supabase → **Authentication → Providers → Apple**: enable and add `com.formfit.app` to
   _Authorized Client IDs_ (enough for native iOS sign-in).
3. Only if you want Apple sign-in on Android/web: create a _Services ID_ (`APPLE_SERVICES_ID`) and a
   Sign in with Apple key, generate the client-secret JWT (`APPLE_SIGNIN_SECRET`) and paste both into Supabase.

### Sentry

1. https://sentry.io → create organization and a **React Native** project named `formfit`.
2. **Settings → Projects → formfit → Client Keys (DSN)** → `EXPO_PUBLIC_SENTRY_DSN`.
3. Org slug → `SENTRY_ORG`, project slug → `SENTRY_PROJECT`.
4. **Settings → Auth Tokens → Create** (scopes `project:releases`, `org:read`) → `SENTRY_AUTH_TOKEN`.

### Analytics (optional, PostHog)

1. https://posthog.com → new project (EU or US cloud).
2. **Project settings** → _Project API key_ (`phc_…`) → `EXPO_PUBLIC_ANALYTICS_KEY`; host
   (`https://eu.i.posthog.com` or `https://us.i.posthog.com`) → `EXPO_PUBLIC_ANALYTICS_HOST`.

### Expo / EAS

1. https://expo.dev → sign up; `npm i -g eas-cli && eas login && eas init` → prints the project ID
   → `EAS_PROJECT_ID`.
2. **Account settings → Access tokens → Create** → `EXPO_TOKEN` (GitHub secret for CI builds).
3. Keep `APP_BUNDLE_ID=com.formfit.app` unless you own a different identifier.

### App info & legal

- `EXPO_PUBLIC_SUPPORT_EMAIL`: a mailbox you read.
- `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_TERMS_URL`: host `docs/PRIVACY.md` / `docs/TERMS.md`
  after legal review (e.g. GitHub Pages, Notion, your site) and paste the https URLs.

## Putting values in place

```bash
# Local
cp .env.example .env   # then fill in (never commit .env)

# EAS (per environment: development, preview, production)
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "…" --visibility plaintext
eas env:create --environment production --name SENTRY_AUTH_TOKEN --value "…" --visibility secret
#   …repeat for each value (public ones: plaintext/sensitive; tokens: secret)

# GitHub Actions (EAS build workflow)
gh secret set EXPO_TOKEN    # paste when prompted

# Supabase database
npx supabase login                     # or export SUPABASE_ACCESS_TOKEN
npx supabase link --project-ref "$SUPABASE_PROJECT_ID"
npx supabase db push                   # applies backend/supabase/migrations
```
