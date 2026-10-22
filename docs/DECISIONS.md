# Architecture Decision Records

Short ADRs. Each records context, the decision and consequences. Newest at the bottom.

---

## ADR-001: Expo SDK 58 with development builds (CNG), New Architecture on

**Context.** The app needs native modules (VisionCamera, TFLite, Skia), so Expo Go is not an option.
Expo SDK 58 (React Native 0.88, React 19.3) is the current stable release (published 2026-09-29).
React Native 0.88 runs the New Architecture only, and every native dependency we plan to use
(VisionCamera 5 / Nitro modules, react-native-fast-tflite 3 / Nitro, Skia 2, Reanimated 4) targets it.

**Decision.** Expo SDK 58, Continuous Native Generation (`expo prebuild`; `android/` and `ios/`
are gitignored and generated), development builds for local work, EAS Build for releases.

**Consequences.** All native configuration lives in `app.config.ts` + config plugins. Developers run
`npm run android|ios` (which builds a dev client) rather than Expo Go. VisionCamera 5 is a
Nitro-based rewrite: its frame-processor API differs from v3/v4 docs, so Phase 2 must verify the
pipeline against the installed version (recorded in ADR follow-ups there).

## ADR-002: Expo Router for navigation

**Context.** Spec allows Expo Router or React Navigation.

**Decision.** Expo Router (file-based routes in `/app`). It is built on React Navigation, so we keep
its primitives (stacks, tabs, themes) while getting typed routes, deep links (`formfit://`) and
less boilerplate.

**Consequences.** Route files stay thin; screen logic lives in `src/features/*`. Routes live in root
`app/` (not `src/app/`), matching the layout in the spec.

## ADR-003: Dark theme by default; light + "follow system" available

**Context.** Spec: dark by default, polished light mode that follows the system setting.

**Decision.** Appearance preference is `'dark' | 'light' | 'system'`, default `'dark'`. With
`'system'`, the OS scheme is used (falling back to dark when unspecified). The preference is
persisted with the settings store once MMKV lands (Phase 5).

## ADR-004: Design tokens enforced by lint and tests

**Decision.** Raw hex colors are only allowed in `src/ui/theme/palette.ts` (+ a few neutral values
like shadow color). ESLint forbids hex literals in `app/**` and `src/features/**`. A Jest test asserts
WCAG AA contrast for every foreground/background token pair in both themes, 4pt spacing, 48dp
minimum hit target, and 150–350 ms UI motion durations.

## ADR-005: Reanimated 4 shared values accessed via `.get()/.set()`

**Context.** SDK 58 ships the React Compiler ESLint rules; mutating `sharedValue.value` from React
code is flagged as mutation of an immutable value.

**Decision.** Use `sv.get()` / `sv.set()` everywhere (Reanimated's React-Compiler-compatible API).
JS→UI callbacks use `scheduleOnRN` from `react-native-worklets` (replacement for `runOnJS`).

## ADR-006: Fonts — Barlow Condensed + Inter; icons — Ionicons only

**Decision.** Barlow Condensed (700/800) for display text and numerals (tabular, narrow, readable
from 2 m); Inter for UI/body text. Both are OFL-licensed, bundled via `@expo-google-fonts/*` and
loaded with `expo-font` before hiding the splash screen. All icons come from Ionicons
(`@expo/vector-icons`) through the `Icon` component so the set stays consistent.

## ADR-007: Screen transitions

**Context.** Spec asks for shared-element or fade/slide transitions (plan list → detail, Today →
workout player). Reanimated 4 shared element transitions are still experimental/feature-flagged.

**Decision.** Native-stack transitions: slide for plan detail, fade + full-screen modal for the workout
player (no swipe-to-dismiss mid-workout), fade between tabs, plus staggered in-screen entrances.
Revisit shared-element transitions in the polish phase if they become stable.

## ADR-008: Git workflow in this environment

**Context.** Spec §7.1 asks for `develop` + per-phase feature branches + PRs. This build runs in a
hosted agent session that may only push to its designated branch
(`claude/ecstatic-maxwell-9jdjr4`).

**Decision.** All phases are committed (Conventional Commits, small commits) and pushed to that
branch; PRs into `Main` are opened on request. CI runs on every PR and on pushes to `Main`/`develop`.

## ADR-009: Docs fetched from package sources when the web is unavailable

**Context.** The build sandbox cannot reach docs.expo.dev or api.expo.dev.

**Decision.** API usage is verified against the installed packages' type definitions and sources in
`node_modules` (exact versions pinned via `expo install --offline` from SDK 58's
`bundledNativeModules.json`), and every change is validated by typecheck, Jest and a full Metro
export for Android and iOS (`npx expo export`).
