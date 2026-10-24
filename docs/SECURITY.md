# Security review (Phase 8)

Scope: the mobile app, local storage, sync, Supabase schema/RLS, build configuration and
third-party services. Reviewed October 2026.

## Threat model (short)

| Asset                    | Threats                                        | Controls                                                                                                                                                                                                                                         |
| ------------------------ | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Camera frames            | Leak of video/images                           | Processed in memory on device only; never written, logged or uploaded (pose pipeline only emits keypoints). Microphone permission blocked on Android.                                                                                            |
| Workout history, profile | Other users reading/changing data; device loss | Supabase RLS on every table (tested on Postgres, 13 assertions); user_id immutable; local DB in app sandbox; Android OS backups disabled (`allowBackup: false`).                                                                                 |
| Auth session             | Token theft from storage                       | Session AES-encrypted in MMKV with a 256-bit key in Keychain/Keystore (SecureStore); HTTPS only; PKCE/ID-token native sign-in, Apple nonce.                                                                                                      |
| Account                  | Unwanted access, right to erasure              | Email OTP / Google / Apple; in-app delete (`delete_my_account()` security definer, `search_path` pinned, deletes only `auth.uid()`); export via `export_my_data()` (security invoker = RLS).                                                     |
| Telemetry                | PII leakage                                    | Sentry `sendDefaultPii: false`, no screenshots/view hierarchy, user/request dropped, events/breadcrumbs scrubbed (emails, tokens, sensitive keys); analytics uses a random install id and scrubbed, coarse props; one opt-out switch stops both. |
| Secrets                  | Committed or bundled secrets                   | Only `EXPO_PUBLIC_*` (publishable) values are bundled; `.env` gitignored; build secrets (Sentry auth token, OAuth secrets) are EAS secrets / Supabase dashboard config.                                                                          |

## Findings and fixes in this review

| #   | Finding                                                                                               | Severity                      | Fix                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | `formfit://workout?resume=<id>` could resume any session id present in the local DB.                  | Low (local DB is single-user) | Resume now requires the session to belong to the current user and be in progress; covered by a navigation test. |
| 2   | Android auto-backup could copy the local workout database to cloud backups outside our deletion flow. | Medium                        | `android.allowBackup = false`.                                                                                  |
| 3   | Data export JSON was left in the app cache after sharing.                                             | Low                           | File deleted after the share sheet closes.                                                                      |
| 4   | Backend/analytics URLs were only validated as URLs.                                                   | Low                           | Production builds reject non-HTTPS endpoints (`src/core/env.ts`).                                               |
| 5   | Crash reports could contain emails or tokens in messages/context.                                     | Medium                        | Scrubbing in `beforeSend`/`beforeBreadcrumb` and the logger sink (`src/core/observability/scrub.ts`, tested).   |

## Verified (no change needed)

- SQL access uses parameters everywhere; table/column names come from typed constants.
- RLS: select/insert/update/delete restricted to `auth.uid()`; anon role revoked; sets can only
  attach to the caller's own sessions; LWW trigger cannot change `user_id`.
- Deep-link params (`plan/[id]`, `exercise/[id]`, `legal/[doc]`) only look up static content or
  whitelisted values.
- No `eval`, dynamic code loading or WebViews. Dev tools (pose lab, galleries, pose recorder) are
  gated behind `__DEV__` feature flags.
- iOS ATS defaults (HTTPS) unchanged; camera usage string explains on-device processing.

## Dependency audit (`npm audit --omit=dev`)

Five "high" advisories, all inside the Expo CLI / code-signing **build tooling**, not in the app
bundle:

- `node-forge <= 1.4.0` (RSA PKCS#1 v1.5 signature check) via `@expo/code-signing-certificates` —
  no patched release exists yet. Only used for EAS Update code signing, which FormFit does not use.
- `zod < 4.6.6` (memory exhaustion on oversized constrained collections) via `@expo/cli`'s own
  zod 3.x. The app bundle uses zod 4.6.7 (patched) and validates only bundled content and env.

Accepted for now; re-run the audit before each release and upgrade Expo when fixes land.

## Recommendations before launch

- Enable Supabase Auth rate limits and CAPTCHA for email OTP and anonymous sign-ins.
- Enable MFA on the Supabase dashboard, EAS/Expo and Sentry accounts (the app itself is passwordless).
- Configure Sentry data scrubbing server-side as defence in depth.
