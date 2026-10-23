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

## ADR-010: VisionCamera 5 (Nitro) with react-native-worklets frame processors

**Context.** VisionCamera 5 is a Nitro-module rewrite; frame processors are provided by the
separate `react-native-vision-camera-worklets` package on top of `react-native-worklets` — the same
worklets runtime Reanimated 4 uses (v4's `react-native-worklets-core` is no longer involved).
`vision-camera-resize-plugin` only supports v4.

**Decision.** VisionCamera 5.2.3 + vision-camera-worklets 5.2.3 + nitro-modules 0.37 / nitro-image
0.15. Frame output: `pixelFormat: 'rgb'`, VGA 4:3 preview-sized buffers, physical buffer rotation
on (upright frames, simplest correct mapping), `dropFramesWhileBusy`. Pose results go to Reanimated
shared values, which are writable from worker runtimes in Reanimated 4.7 (verified in source).

## ADR-011: BlazePose (MediaPipe) as default pose model; MoveNet optional

See `docs/POSE_MODELS.md`. MoveNet files could not be obtained in this build (Kaggle/TF Hub
interactive download); BlazePose bundles are public, provide heels/feet and visibility, and track
via rotated ROIs. Both implement `PoseEstimator`; MoveNet is enabled with `npm run models:fetch`.
Bundled weight 12.2 MB (< 15 MB budget, tested).

## ADR-012: ROI crop/normalization runs as a TFLite graph, not JavaScript

**Context.** Measured in the Hermes VM: rotated 256² crop in JS ≈ 22 ms/frame (no JIT in worklet
runtimes). **Decision.** An 8 KB builtin-ops TFLite graph per input size does the gather/normalize
natively (≈2.4 ms on the same CPU), driven by 15 affine params from JS. Verified bit-identical to
the reference; JS sampler kept as fallback.

## ADR-013: CoreML on iOS, OpenCL GPU on Android, CPU fallback

fast-tflite 3.0.1's Metal delegate throws "not yet supported", so iOS uses CoreML (config plugin
flag). Android uses the GPU delegate (OpenCL libs declared via the plugin). `loadModelWithFallback`
retries on CPU if a delegate fails to initialise.

## ADR-014: Pure, worklet-safe exercise engine driven by typed definitions

Each exercise is one data-driven `ExerciseDefinition` (features, typed thresholds with difficulty and
view overrides, counter config, form rules, classifier signature) registered in a registry. The engine
(`processPose`) is a deterministic state machine: One-Euro smoothing (low-confidence points held) →
confidence gating with hysteresis (350 ms lost / 200 ms found; frames within the grace period still
count, NaN features are skipped individually) → sticky best side and auto view → features → rep counter
(start-zone persistence + excursion extreme; hysteresis between start/partial/peak) or hold timer →
debounced rules with per-rule cooldown → quality score (ROM 40 pts, −3/−10/−25 per info/warning/critical,
−10 tempo). All functions carry `'worklet'` so Phase 6 can run the engine on the camera thread; the
Pose lab runs it on the JS thread for now (dev only).

## ADR-015: View-invariant signals where 2D angles fail

Front-view knee angles are badly foreshortened, so squats facing the camera and high knees use
vertical thigh drop normalized by a **reference torso length** (running max, slowly decaying), which is
invariant to camera yaw and to forward lean. Side-view squats keep the knee angle.

## ADR-016: 3D stick-figure keyframes shared by demos, ghost overlay and tests

Keyframes are joint angles of a rigid 3D skeleton (FK + orthographic projection with camera yaw),
emitted in the canonical 21-keypoint format. One source feeds the animated demos (Phase 7), the ghost
target overlay and deterministic synthetic test sequences, and tests assert keyframes satisfy the rep
thresholds — content and counting can't drift apart.

## ADR-017: Rule-based classifier first, learned model later

A signature-based classifier over generic window features reaches 100 % top-1 on the replay fixtures
with zero training data and is explainable. The `ExerciseClassifier` interface leaves a seam for a
< 1 MB TFLite model once labelled device recordings exist (docs/EXERCISE_CLASSIFIER.md).

## ADR-018: Pose timestamps use the worklet's monotonic ms clock

`Frame.timestamp` units differ by platform; smoothing, persistence and tempo need milliseconds, so the
frame processor stamps poses with `performance.now()` (fallback `Date.now()`).

## ADR-019: expo-speech for TTS

expo-speech (SDK-versioned, maintained, no extra native setup) covers language, voice, rate, pitch,
volume and per-utterance callbacks. react-native-tts would add ducking options on Android but is a
community package with slower New-Architecture support; the missing piece (audio focus) is a ~60-line
local module instead.

## ADR-020: Duck, don't pause, the user's music

iOS: `useApplicationAudioSession: false` (system speech session mixes + ducks). Android: transient
"may duck" audio focus only while the coach speaks, released 350 ms after the queue drains. The app
never takes long-lived focus, so music apps keep playing at full volume between cues.

## ADR-021: Speech queue semantics

One utterance at a time; strict priorities (form > counts > encouragement, countdown may interrupt);
per-cue cooldown 4.5 s; counts coalesce and expire after 1.5 s; bounded queue. Pure and unit-tested
with fake timers (no real TTS needed).
