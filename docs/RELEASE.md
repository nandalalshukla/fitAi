# Release guide & checklist

## Versioning

- **Marketing version** (`1.2.3`, SemVer) lives in `package.json` → read by `app.config.ts`.
  Bump it with `npm version minor` (or patch/major), update `CHANGELOG.md`.
- **Build numbers** (iOS `buildNumber`, Android `versionCode`) are managed remotely by EAS
  (`appVersionSource: remote`) and auto-incremented on every production build.
- Tag releases `vX.Y.Z`; pushing a tag runs `.github/workflows/eas-build.yml` (production build).

## Build profiles (`eas.json`)

| Profile                                 | Bundle id                 | Use                                                          |
| --------------------------------------- | ------------------------- | ------------------------------------------------------------ |
| `development` / `development-simulator` | `com.formfit.app.dev`     | Dev client for daily work and device testing                 |
| `preview`                               | `com.formfit.app.preview` | Internal testers (APK / ad-hoc), production-like             |
| `production`                            | `com.formfit.app`         | Store builds (AAB / IPA), R8 + resource shrinking on Android |

## One-time setup

1. `npm i -g eas-cli && eas login && eas init` → put the project id in `EAS_PROJECT_ID`.
2. EAS secrets (never in git): `eas secret:create` for `SENTRY_AUTH_TOKEN`, plus all
   `EXPO_PUBLIC_*` values per environment (or EAS environment variables).
3. Supabase: create the project, `npx supabase link --project-ref $SUPABASE_PROJECT_ID`,
   `npx supabase db push`, enable anonymous sign-ins, email OTP template with `{{ .Token }}`,
   Apple/Google providers, Auth rate limits/CAPTCHA (see `backend/supabase/README.md`).
4. Apple: App ID with Sign in with Apple, App Store Connect app record; Google Play: app record,
   upload key handled by EAS, Data safety + content rating forms (`docs/STORE_LISTING.md`).
5. GitHub: `EXPO_TOKEN` repository secret for the EAS build workflow.
6. Host `docs/PRIVACY.md` and `docs/TERMS.md` (after legal review) and set
   `EXPO_PUBLIC_PRIVACY_URL` / `EXPO_PUBLIC_TERMS_URL`.

## Release checklist

**Code & quality**

- [ ] `main` is green in CI (lint, typecheck, unit tests, RLS tests).
- [ ] `npm run release:check` locally (adds `expo-doctor`).
- [ ] `npm audit --omit=dev` reviewed; new findings triaged in `docs/SECURITY.md`.
- [ ] Version bumped, `CHANGELOG.md` updated, tag created.

**Device verification** (preview build, one mid-range Android + one iPhone ≥ 11)

- [ ] Pose lab benchmark recorded in `docs/POSE_SPIKE.md` (camera ≥ 24 fps, inference within budget).
- [ ] Rep counting on squat, push-up, jumping jack, plank in good light and dim light; front and side.
- [ ] Phone sideways on the floor (landscape) for push-ups/planks: layout, skeleton alignment and counting.
- [ ] Voice coach over Spotify/Apple Music: ducks and restores volume; pauses during a phone call.
- [ ] 30-minute session: no memory growth (Instruments / Android Studio), device temperature acceptable.
- [ ] Maestro: `npm run test:e2e` passes on iOS simulator and Android emulator.
- [ ] Camera permission denied → manual counting works; notifications denied → reminders explain.
- [ ] Offline: complete a workout in airplane mode; it syncs after reconnecting.
- [ ] Accounts: guest → email upgrade keeps history; delete account removes server data.
- [ ] VoiceOver / TalkBack pass on onboarding, Today, player, summary; Reduce Motion on.
- [ ] Small (iPhone SE) and large (Pro Max, Android tablet) screens; light and dark mode.

**Release config**

- [ ] `EXPO_PUBLIC_*` production values set (Supabase, Sentry DSN, analytics, Google client ids,
      support email, privacy/terms URLs); `.env` not committed.
- [ ] Sentry release created with source maps (build log shows the upload).
- [ ] Privacy manifest / nutrition label / Data safety answers match `docs/STORE_LISTING.md`.

**Store**

- [ ] Screenshots (plan in `docs/STORE_LISTING.md`), feature graphic, icon reviewed.
- [ ] Listing copy, keywords, support URL, privacy policy URL, age/content rating.
- [ ] Review notes for Apple: explain camera use (on-device), provide a demo account or guest mode.
- [ ] `npm run build:android && npm run build:ios` (or tag), then `npm run submit:android` /
      `npm run submit:ios`; Play: internal → closed → production with staged rollout (10 % → 100 %).

**After release**

- [ ] Watch Sentry crash-free sessions (target ≥ 99.5 %) and analytics funnels
      (onboarding_completed → workout_started → workout_finished) for 72 h.
- [ ] Halt the staged rollout if crash rate or 1-star reviews spike.

## Brand assets

Icons, splash and the feature graphic are generated from `tools/brand/glyph.mjs`:
`PLAYWRIGHT_PATH=… CHROMIUM_PATH=… npm run brand:render` (needs Playwright + Chromium). SVG sources
are kept in `assets/brand/`.
