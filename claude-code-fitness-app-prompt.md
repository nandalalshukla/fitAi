# PROMPT FOR CLAUDE CODE: Build "FormFit", an AI Fitness Coach App (React Native + TypeScript, Android + iOS)

You are a senior mobile engineer and architect. Build a **production-ready, store-shippable** fitness app for **Android and iOS** using **React Native + TypeScript**. Work autonomously end to end: plan, implement, test, commit to GitHub as you go, and finish with a ready-to-ship app. (App name is a placeholder: use "FormFit" unless I say otherwise.)

---

## 1. Product Vision

Home-workout users lose count of reps and don't know their form is wrong (shallow squats, rounded back, sagging hips). Trainers are expensive. FormFit gives them:

1. **Prebuilt workout plans** for specific goals (e.g. "6-Pack Abs", "Full-Body Fat Burn", "Beginner Strength", "Lower-Body Power", "Mobility and Physio Basics"). Each plan has daily sessions (~up to 60 min) with exercises, sets, reps and rest, e.g. 3x20 push-ups, 2x20 squats, 2x20 jumping jacks.
2. A user **selects a plan**, then each day opens the app, taps **"Today's Workout"**, and starts.
3. The phone camera **detects the exercise, counts reps automatically, checks form in real time, and speaks** short coaching cues ("go lower", "keep your back straight") and announces rep/set completion ("10... 15... set complete!").
4. **History and progress**: sets and reps per day, streaks, weekly charts.

Target users: home workout users and physiotherapy patients doing prescribed exercises. UX must feel premium: fast, polished, motivating, and usable hands-free from 1-2 m away (big text, voice, high-contrast).

---

## 2. Critical Technical Constraint (read first)

My original research notes assume a *browser* stack (`@mediapipe/tasks-vision`, `<canvas>`, Web Speech API). **These do not work in React Native.** Keep the same pipeline but use native equivalents:

```
Camera frames -> On-device pose model -> keypoints -> smoothing -> joint angles
-> per-exercise state machine (UP/DOWN hysteresis => rep) -> form rules
-> voice + on-screen feedback -> save to local DB -> sync to backend
```

Required stack decisions (validate current versions/compatibility via web search before installing; do not guess APIs):

- **Framework**: Expo (SDK current stable) with **development builds / prebuild (CNG)**, since native modules are required (Expo Go will NOT work). Use EAS Build for release builds. New Architecture if all dependencies support it; otherwise justify the choice in `docs/DECISIONS.md`.
- **Camera + frame processing**: `react-native-vision-camera` (frame processors) with `react-native-worklets-core`. Front camera default, with a toggle for back camera. Target a stable 20-30 FPS inference; throttle/skip frames adaptively on slow devices.
- **Pose model (small, on-device, precise)**: run a **TFLite** pose model through `react-native-fast-tflite` (GPU/NNAPI/CoreML delegates where available, CPU fallback).
  - Primary: **MoveNet Lightning (int8/float16, ~3-7 MB)** for speed, with **MoveNet Thunder** as an optional "High accuracy" mode.
  - Alternative behind the same interface: **MediaPipe BlazePose/Pose Landmarker lite (~3-9 MB, 33 keypoints)** if a maintained React Native binding exists or you can write a small native module; evaluate and document the tradeoff.
  - Implement a **`PoseEstimator` interface** (`init()`, `estimate(frame) -> Keypoint[]`, `dispose()`), so models are swappable. Model files are bundled as assets (offline-first; no model downloads required to work). Total added model weight must stay under ~15 MB.
  - Everything runs **100% on-device**. No video frames or images ever leave the phone. State this in the privacy policy.
- **Skeleton overlay**: draw keypoints/bones over the camera preview using `@shopify/react-native-skia` (preferably drawn from the frame processor / shared values for 60fps UI without React re-renders).
- **Voice feedback**: `expo-speech` (or `react-native-tts` if you justify it) with a **speech queue manager**: no overlapping utterances, priority levels (form warning > rep count > encouragement), per-cue cooldown so the same cue isn't repeated more than once every ~4-5 s, and a mute/volume/voice-language setting. Must duck/mix properly with the user's music (audio session config on iOS, audio focus on Android).
- **State management**: Zustand (app state) + TanStack Query (server state). Forms with react-hook-form + zod.
- **Navigation**: Expo Router (or React Navigation, your choice, justify).
- **Local storage**: `expo-sqlite` (or WatermelonDB) for workout logs, plus MMKV for settings. **Offline-first**: the whole workout flow must work with no network; sync when online.
- **Backend**: **Supabase** (Auth: email + Google + Apple Sign-In; Postgres with Row Level Security; generated TS types). Provide SQL migrations in `/backend/supabase/migrations`. Plans may be seeded from the repo (bundled JSON) and optionally updated remotely. If you believe Firebase is better, explain briefly in `docs/DECISIONS.md`, but default to Supabase.
- **Charts**: `victory-native` or Skia-based charts for weekly progress.
- **Quality**: TypeScript `strict: true`, ESLint, Prettier, Husky + lint-staged, commitlint (Conventional Commits), Jest + React Native Testing Library, Maestro (or Detox) for a smoke E2E flow.
- **Observability**: Sentry (crash reporting) and a privacy-respecting analytics layer (PostHog or Firebase Analytics) behind an `analytics` interface, with a user opt-out in Settings.
- **i18n**: `i18next`-based, English complete, structure ready for more languages (spoken cues must also be translatable).

---

## 3. Core AI Feature Spec (the heart of the app, make this excellent)

### 3.1 Pose pipeline
1. Frame -> model -> 17 (or 33) keypoints with confidence scores.
2. **Confidence gating**: ignore keypoints below a threshold; if key joints for the current exercise are not visible, show an on-screen guide ("Step back so your full body is visible") and pause counting.
3. **Smoothing**: One-Euro filter (preferred) or moving average over 3-5 frames per keypoint/angle to remove jitter.
4. **Geometry utils** (pure, fully unit-tested): `angle(a, b, c)` in degrees (2D, with optional visibility weighting), distance, line-to-vertical/horizontal deviation, body-orientation estimation (standing / horizontal-prone / side-view), normalization by torso length so rules are scale-invariant.

### 3.2 Exercise engine (modular, plugin-style)
Create an `ExerciseDefinition` interface and a registry so **adding a new exercise = adding one file + registering it**. Each definition includes:

- `id`, `name`, `category`, `targetMuscles`, `cameraPlacement` guide (side/front, distance, orientation) with an illustration/animation slot
- `requiredKeypoints`
- `RepCounter` **state machine** with phases (e.g. `UP -> DOWN -> UP = 1 rep`), **hysteresis** and thresholds (e.g. squat DOWN when knee angle < ~90-100, UP when > ~160), minimum phase duration, and a minimum rep time to prevent double counts
- `FormRule[]`: each rule has an id, a check function over the current/tracked angles, severity, a spoken cue (i18n key), an on-screen message, and a cooldown
- `tempo` tracking (optional): flag reps that are too fast
- Rep **quality score** (0-100) per rep from depth/range-of-motion and form violations

Implement at minimum these exercises with proper rules:

| Exercise | Counting signal | Form rules |
|---|---|---|
| Squat | knee angle | depth (too shallow), torso lean/back rounding, knees caving (knee x vs ankle x), heels/weight shift if detectable |
| Push-up | elbow angle | hip sag/pike (shoulder-hip-ankle line), incomplete range, head drop |
| Jumping jack | arm elevation + leg spread cycle | incomplete arm raise, narrow leg spread |
| Plank (timed) | hold timer | hips sagging/high, neck alignment; speaks time milestones |
| Sit-up / Crunch | torso-hip angle | incomplete range, neck pulling |
| Lunge | front knee angle | knee past toe, torso lean, depth |
| High knees / Mountain climbers | alternating knee/hip cycle | tempo, hip height |
| Glute bridge / Leg raise | hip angle | hip height, lower-back arch |

Make thresholds **configurable per exercise and per difficulty** and per camera angle (side vs front); keep them in typed config, not scattered magic numbers.

### 3.3 Automatic exercise detection
The app should work in two modes:
- **Guided mode (default)**: today's plan tells the app which exercise is current; the engine runs that exercise's counter. Also run a lightweight **exercise recognizer** in the background that verifies the user is actually doing it (based on body orientation + joint motion signatures) and prompts "Looks like you're doing X, switch?" or auto-advances if confidently detected.
- **Free mode**: user picks "Just start", and the recognizer classifies the exercise among the supported list and starts counting.

Start with a **rule/feature-based classifier** (orientation, joint-angle ranges, motion periodicity) behind an `ExerciseClassifier` interface. Leave a clean seam to later plug in a tiny TFLite classifier over keypoint windows (<1 MB). Document how to train/replace it in `docs/`.

### 3.4 Workout session flow
Today screen -> **Camera setup/positioning check** (silhouette guide, "full body visible" detection, lighting hint) -> 3-2-1 countdown with voice -> exercise runs with live rep counter, set indicator, form-feedback banner, skeleton overlay toggle -> rep milestone speech (every rep or every 5, configurable) -> "Set complete" -> **rest timer** (skip/extend, next exercise preview) -> ... -> **Session summary** (reps, sets, avg form score, calories estimate, streak, share card).

Also support: pause/resume, manual rep correction (+/-) if the camera missed one, manual completion fallback if the camera can't be used, and handling of interruptions (phone call, app backgrounded, permission revoked).

### 3.5 Performance and precision requirements
- Runs smoothly on mid-range devices (e.g. 4 GB RAM Android, iPhone 11 or newer). Provide an **adaptive performance mode** (lower input resolution/FPS when frame time exceeds budget, thermal-throttling awareness).
- Inference off the JS thread (worklets); no per-frame React re-renders; no memory growth over a 60-minute session (verify).
- Build a **dev-only debug overlay**: FPS, inference ms, keypoint confidences, live angles, current state-machine phase.
- Build a **replay test harness**: record keypoint sequences to JSON fixtures, and run rep counter + form rules against them in Jest, asserting exact rep counts and expected form flags. Include fixtures for good reps, shallow reps, jittery input, and partial occlusion. **Rep-counting accuracy target: >=95% on fixtures.**

---

## 4. App Features and Screens

1. **Onboarding**: goal, fitness level, equipment (none by default), days/week, permissions education (camera, notifications), medical/safety disclaimer ("consult a doctor...").
2. **Auth**: email, Google, Apple (required on iOS if other social logins exist), plus **guest mode** with later account upgrade and data migration.
3. **Plan library**: browse by goal and difficulty, plan detail (weeks, days, sample session, duration), **select/switch plan**, progress through plan days (Day 1...Day N), rest days, auto-progression (difficulty increases week to week).
4. **Home / Today**: today's workout card, streak, weekly progress ring, quick start.
5. **Exercise library**: list + detail with instructions, form tips, target muscles, camera placement guide.
6. **Workout player (camera screen)**: per Section 3.4.
7. **Progress/History**: calendar heatmap, weekly/monthly charts (reps, sessions, minutes, form score), personal bests, per-exercise trend.
8. **Reminders**: local push notifications for daily workout time; streak-saver nudges.
9. **Settings**: voice on/off, voice language/speed, cue verbosity (minimal/standard/coach), skeleton overlay on/off, camera selection, units, model accuracy mode, analytics opt-out, data export, **delete account and data** (required by app stores), legal links, support/feedback.
10. **Plan content**: Claude authors all plans and exercise content itself, based on real research. See Section 4B. Minimum 10 complete plans, validated with zod, including the 6-pack abs plan (a daily ~1 hr home workout with exercise blocks like 3x20 push-ups, 2x20 squats, 2x20 jumping jacks, plus core work, warm-up and cool-down).
10a. **Exercise instruction animations**: every exercise has an animated, step-by-step "how to do it" guide. See Section 4B.
11. **Accessibility**: screen-reader labels, dynamic type, color-contrast AA, haptic feedback, voice-only usable flow, reduced-motion respect.
12. **Design**: see Section 4A (UI/UX and Animation Requirements). It is a first-class requirement, not polish at the end. Create app icon, splash screen and adaptive icon assets (generate placeholders as SVG/PNG if no brand assets are provided).

---

## 4A. UI/UX and Animation Requirements (first-class, built from Phase 1)

The app must feel **clean, premium, and delightful**, comparable to best-in-class fitness apps (Nike Training Club, Apple Fitness, Strava). Use the `frontend-design`-style approach: make deliberate, distinctive design choices, not generic template defaults.

**Visual design**
- Build a **design system first** (`src/ui/`, theme tokens for color, typography scale, spacing 4/8pt grid, radii, elevation, motion durations/easings) and use only tokens in screens. No hard-coded colors/sizes in feature code.
- Energetic but clean look: dark mode by default with a high-contrast accent color, plus a polished light mode that follows system setting. Generous whitespace, clear visual hierarchy, one primary action per screen, large tap targets (min 48dp).
- Pick one strong, legible font pairing (e.g. a bold display font for numbers/headings, a clean sans for body) loaded via `expo-font`. Rep counter and timers use very large tabular numerals readable from 2 m away.
- Consistent iconography (single icon set), rounded cards, subtle gradients/blur where it adds depth, and real illustrations/Lottie for empty states and exercise guides.
- Build reusable components: Button, Card, PlanCard, ExerciseTile, ProgressRing, StatTile, Chip, BottomSheet, Toast, Skeleton, EmptyState, ErrorState, Modal, ListItem, Tabs, Stepper.

**Animation and motion (smooth, 60fps, purposeful)**
- Use **React Native Reanimated** (worklets, shared values, layout animations) and **Gesture Handler** for all motion so animations run on the UI thread; use **Skia** for the skeleton overlay and rich visuals; **Lottie** for celebratory/illustrative animations.
- Required animations:
  - Screen transitions: shared-element or fade/slide transitions between plan list -> plan detail, and Today -> workout player.
  - Staggered list/card entrance animations; press feedback (scale + haptic) on every tappable element.
  - Workout player: animated rep counter (number flip/spring pop on each rep), animated progress ring for sets/session, smooth form-warning banner slide-in/out, color-shifting skeleton overlay (green when form is good, amber/red when flagged), countdown 3-2-1 with scale/fade, rest-timer ring animation.
  - Celebrations: set-complete and session-complete animations (confetti/Lottie), streak flame animation, personal-best highlight.
  - Charts animate in (draw/grow) and respond to touch.
  - Onboarding with smooth paging, animated progress, and parallax/illustration motion.
  - Skeleton loaders and animated empty/error states instead of blank screens or spinners.
- Motion rules: durations roughly 150-350 ms, natural spring/ease curves defined as tokens, no jank, no animation blocking the JS thread, **respect "Reduce Motion"** accessibility setting (fall back to simple fades). Camera/pose frame loop must never drop FPS because of UI animation; verify with the perf overlay.

**UX principles**
- Hands-free-first workout screen: minimal UI during exercise (rep count, exercise name, set X/Y, form banner, pause), everything else tucked away; voice does the talking.
- Get users to "Start today's workout" in **at most 2 taps** from app launch.
- Clear feedback for every state: loading, success, error, offline, permission denied (with a friendly path to settings), low-light/no-body-detected guidance.
- Forgiving flows: undo, confirm before destructive actions, resume an interrupted session.
- Haptics (`expo-haptics`) on rep completion, set completion and warnings; consistent micro-copy with an encouraging, coach-like tone.
- Safe-area, notch, tablet/foldable and landscape handling; no layout overflow on small phones (test iPhone SE-size and large Android).
- **Accessibility**: AA contrast, screen-reader labels, dynamic type support, never convey meaning by color alone.
- Before finishing each product screen, review it against this section and fix rough edges. In the hardening phase, do a dedicated **UI/UX polish pass** (spacing, alignment, motion timing, consistency) and keep a `docs/DESIGN_SYSTEM.md` with tokens, components and motion guidelines.

---

## 4B. Content Creation: Workout Plans and Animated Exercise Guides (Claude does this itself)

I am not supplying any plans or exercise content. **You must research and author all of it**, and the quality must be good enough that a certified trainer would find it sensible and safe.

### 4B.1 Research first (use web search; do not write plans from memory alone)
- Research reputable sources on exercise science and bodybuilding/fitness programming, for example: ACSM and NSCA position stands, WHO physical activity guidelines, peer-reviewed hypertrophy and training-volume research (e.g. Schoenfeld and colleagues), progressive-overload and deload principles, bodyweight/calisthenics progressions, core-training and mobility/physio references, and well-regarded coaching resources.
- Cover at least: training volume and frequency per muscle group, rep ranges for strength vs hypertrophy vs endurance, rest intervals, progressive overload for bodyweight training, warm-up and cool-down protocols, core training for visible abs (and the honest role of nutrition and body fat), HIIT/cardio structure, mobility and injury-prevention basics, and beginner vs intermediate vs advanced progressions.
- Save a **`docs/CONTENT_RESEARCH.md`** with: sources consulted (title + URL), the key principles you extracted (in your own words, no copy-pasted text), and how each principle maps to plan design decisions. Do not reproduce copyrighted text or images; paraphrase and cite.
- Where evidence is mixed or contested, pick the conservative, safe option and note it.

### 4B.2 Plans to create (minimum 10, home/bodyweight-first, optional dumbbell/resistance-band variants)
Suggested set (adjust based on your research): **6-Pack Abs Builder**, **Full-Body Fat Burn (HIIT)**, **Beginner Foundations (first 4 weeks)**, **Push-Pull-Legs at Home / Muscle Builder (bodyweight)**, **Upper-Body Strength**, **Lower-Body and Glutes**, **Core and Posture**, **Mobility and Flexibility**, **15-Minute Express Daily**, **Physio-Friendly Low-Impact Rehab Basics** (clearly labeled as general fitness, not medical treatment), and optionally **Dumbbell Home Gym**.

Each plan must include:
- Goal, target level (beginner/intermediate/advanced), duration in weeks (e.g. 4-12), days per week, equipment, expected session length, and a short, honest "what to expect" description (no exaggerated claims; e.g. visible abs depend on body-fat level and nutrition, and the plan says so).
- A **full day-by-day schedule** including rest/active-recovery days, with each session structured as **warm-up -> main blocks -> finisher (optional) -> cool-down/stretch**.
- Every exercise entry specifies sets, reps (or seconds), tempo (optional), rest between sets, and which camera-trackable exercise it maps to (or flags it as "manual / not camera-tracked").
- **Progressive overload built in**: weekly increases (reps, sets, harder variations, shorter rest, tempo) and a **deload week** where appropriate. Include easier/harder alternatives for each exercise so users can regress/progress.
- A mix of exercises that does not overtrain the same muscles on consecutive days; sensible total volume. The 60-minute sessions must realistically add up to about 60 minutes including rests (compute and **assert this in tests**).
- Safety notes and contraindications (who should check with a doctor first).
- Stored as typed data under `/src/content/plans`, validated by zod schemas, with a test that checks structural rules (no empty days, valid exercise IDs, durations add up, progression present).
- Have a **self-review pass** at the end: re-read every plan as if you were a strength coach, fix imbalances, unsafe jumps, or unrealistic volumes, and note the review in `docs/CONTENT_RESEARCH.md`.

### 4B.3 Exercise library with detailed, animated how-to guides
Create a complete exercise catalog (target 40+ exercises, at least every exercise used in any plan, including all camera-tracked ones from Section 3.2). For **every exercise** provide:
- Name, category, difficulty, target muscles (primary/secondary), equipment, and whether it is camera-tracked.
- **Detailed numbered steps (typically 4-7)** covering: setup/starting position, the movement (down/up phases), end position, tempo and breathing (when to inhale/exhale), and where to look and what to brace.
- **Key form cues** (short, same wording used by the voice coach so the app's spoken cues and the instructions match).
- **Common mistakes and how to fix them**, **easier and harder variations**, safety notes, and a recommended camera placement.
- **An animated demonstration** (see below), shown on the exercise detail screen, in the pre-exercise "get ready" screen of the workout player, and as a looping mini-preview during the rest screen for the next exercise.

**How to build the animations (no stock/copyrighted video needed):**
- Create **original, procedurally animated figures**. Define each exercise as **canonical keyframe poses** (joint positions/angles per phase, e.g. squat: standing -> mid -> bottom -> mid -> standing), stored as typed data using the **same skeleton format as the pose engine**. Render with **Skia** (or Lottie/Rive if you produce clean original assets) by interpolating between keyframes with easing, so the figure performs a smooth, looping, loop-perfect movement. A stylized mannequin/stick-figure with rounded limbs and highlighted target muscles is ideal.
- Animation features: play/pause, speed control (0.5x/1x), **step-synced mode** (tapping or auto-advancing through the numbered steps highlights the current step text while the figure holds/animates that phase), a **side view and front view** toggle where relevant, color highlighting of the working muscles and key joints, and subtle annotation arrows/labels for key cues (e.g. "keep back flat", "knees over toes").
- **Reuse the same keyframe data as the "ghost target"** in the camera workout screen: optionally overlay the ideal pose translucently next to the user's live skeleton in an on-screen picture-in-picture panel so they can see the target form.
- Animations must be smooth (60fps), lightweight (no large video files; keep total content assets small), respect Reduce Motion (show static step images/poses with step navigation instead), and work offline.
- Provide a dev tool/script and `docs/ADDING_AN_EXERCISE.md` section so adding a new exercise's keyframes + steps is straightforward, plus a **storybook-style preview screen** (dev-only) that plays every exercise animation so you can verify them visually.
- Sanity-check each animation: the keyframes must be anatomically plausible (joint angles within normal ranges, consistent limb lengths) and match the rep counter's thresholds for that exercise. Add unit tests asserting the keyframe angles land inside the exercise's UP/DOWN threshold ranges.

---

## 5. Architecture and Code Quality Requirements

Use a **feature-based, layered, modular** structure that is scalable and developer-friendly. Suggested layout (adapt if you have a better reason, but keep the principles):

```
/
├── app/                      # routes (Expo Router)
├── src/
│   ├── core/                 # config, env, logger, errors, DI/service locator, analytics iface, theme
│   ├── features/
│   │   ├── auth/
│   │   ├── onboarding/
│   │   ├── plans/
│   │   ├── workout-session/   # session orchestration, rest timer, summary
│   │   ├── pose/              # PoseEstimator iface, TFLite impl, smoothing, camera pipeline, skeleton overlay
│   │   ├── exercises/         # ExerciseDefinition registry, rep counters, form rules, classifier
│   │   ├── voice/             # speech queue, cue catalog
│   │   ├── history/           # logs, charts, stats
│   │   └── settings/
│   ├── data/                  # sqlite repos, supabase client, sync engine, DTO mappers
│   ├── content/               # plans + exercise metadata (validated JSON/TS)
│   ├── ui/                    # design system components
│   ├── i18n/
│   └── utils/
├── assets/models/            # bundled .tflite files + README with provenance and licenses
├── backend/supabase/         # migrations, RLS policies, seed
├── docs/                     # ARCHITECTURE.md, DECISIONS.md (ADRs), ADDING_AN_EXERCISE.md, ADDING_A_PLAN.md, POSE_MODELS.md, RELEASE.md, PRIVACY.md
├── e2e/                      # Maestro flows
└── .github/workflows/        # CI
```

Principles:
- **Pure domain logic** (angles, state machines, form rules, classifier) must be free of React/React Native imports and 100% unit-testable.
- Depend on **interfaces** (PoseEstimator, SpeechService, Analytics, Repository) with injected implementations so things are mockable/swappable.
- Repository pattern for data access; a **sync engine** with a local outbox, idempotent writes and conflict policy (last-write-wins per record, documented).
- Strict typing, no `any`, path aliases, barrel files only at feature boundaries, consistent error handling (typed `Result`/error classes), a central logger.
- Every module has a short README or header doc; `README.md` at root with setup, scripts, architecture diagram (Mermaid) and troubleshooting. Provide `npm run` scripts: `start`, `android`, `ios`, `lint`, `typecheck`, `test`, `test:e2e`, `build:android`, `build:ios`, `db:types`, etc.
- Feature flags (simple typed config) for experimental things (e.g. free-mode classifier).

---

## 6. Security, Privacy, Compliance (store-readiness)

- No video/image storage or upload. Camera frames are processed in memory only.
- Secrets only via env/EAS secrets; never commit `.env`. Provide `.env.example` with every variable documented.
- Supabase **RLS on every table**; users can only access their own rows. Provide tests or SQL assertions.
- Secure token storage (`expo-secure-store`). HTTPS only.
- Account deletion flow (in-app) that deletes server data; data export.
- Android: correct permissions (camera, notifications, no unnecessary ones), target the latest required API level, ProGuard/R8 enabled, 64-bit builds, Play **Data safety** answers drafted in `docs/STORE_LISTING.md`.
- iOS: `NSCameraUsageDescription` etc. with clear text, Privacy Manifest (`PrivacyInfo.xcprivacy`), App Tracking Transparency only if needed, Sign in with Apple, App Store privacy nutrition label answers drafted.
- Draft: privacy policy, terms of service, medical disclaimer, store listing copy (title, subtitle, description, keywords, screenshots plan) in `docs/`.
- Health claims: avoid medical claims; calorie estimates labeled as estimates.

---

## 7. Process and Workflow (follow strictly)

### 7.1 Git and GitHub
- First, **ask me for the GitHub repository** (URL, or permission to create one with `gh`), and the default branch name. Do not proceed to push until you have this.
- Use **small, frequent commits with Conventional Commits** (`feat(pose): ...`, `fix(rep-counter): ...`, `test: ...`, `docs: ...`, `chore: ...`) and **push after every meaningful milestone**.
- Work on a `develop` branch plus **feature branches -> PRs -> merge** per major phase (so history is reviewable), with `main` always buildable. Write good PR descriptions.
- Add GitHub Actions CI: lint, typecheck, unit tests on every PR; optional EAS build workflow on tags. Add issue/PR templates and a `CONTRIBUTING.md`.

### 7.2 Phased delivery (complete each phase, run checks, commit, push, and give me a 3-5 line status update before moving on)

1. **Foundation**: repo setup, Expo + TS strict, tooling, CI, **design system with theme tokens, motion tokens and core animated components (Section 4A)**, navigation shell with transitions, env handling, ADR doc.
2. **Pose spike**: VisionCamera + TFLite MoveNet + Skia skeleton overlay on a real build; measure FPS and latency; document results. *If a library choice fails on the New Architecture or a current SDK version, research and adapt, and record the decision.*
3. **Domain engine**: geometry, smoothing, exercise registry, rep counters, form rules, classifier, replay harness + fixtures + tests.
4. **Voice**: speech queue, cue catalog, audio session behavior.
5. **Data and backend**: SQLite repos, Supabase schema/RLS/migrations, auth, sync engine.
6. **Product screens**: onboarding, plans, today, workout player, rest, summary, history charts, settings, reminders, exercise library.
7. **Content**: web research and `docs/CONTENT_RESEARCH.md`, 10+ plans, 40+ exercises with detailed step-by-step instructions, keyframe-driven animated demos, ghost-pose overlay, content validation tests, and the coach-style self-review pass (Section 4B). Start the exercise keyframe format and a first animated exercise earlier (Phase 3) so it shares the pose skeleton format.
8. **Hardening**: **UI/UX and animation polish pass**, performance profiling (including animation smoothness alongside the camera loop), memory/thermal tests, accessibility pass, error/empty states, offline tests, Sentry, analytics, E2E smoke flow, security review.
9. **Release prep**: icons/splash, app config, EAS profiles (development/preview/production), versioning, store docs, privacy docs, release checklist (`docs/RELEASE.md`).

### 7.3 Quality gates (before each push)
`npm run lint && npm run typecheck && npm test` must pass. Do not leave TODOs without a tracked issue. Do not claim something works unless you ran it. If you cannot run a device/simulator step in this environment, say so explicitly and give me the exact command/steps to verify on my machine.

### 7.4 Ask me when blocked, but not for things you can decide
Make sensible decisions yourself and record them in `docs/DECISIONS.md`. Only ask me for: the GitHub repo, brand/app name/bundle IDs if I want to change defaults, and the environment values below.

---

## 8. Environment Variables: Final Step (do this at the end)

When implementation is complete:

1. Create `.env.example` (committed) and `.env` (gitignored) containing every variable the app needs, each with a comment, e.g.:
   - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
   - `EXPO_PUBLIC_ANALYTICS_KEY` (+ host)
   - `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID` (Google Sign-In)
   - Apple Sign-In / bundle identifiers / EAS project ID, and any others your implementation introduced
   - Mark clearly which are **public client-side** (`EXPO_PUBLIC_*`) vs **secret build-time** values (never bundled into the app).
2. **Stop and ask me to provide each value**, listing exactly what each one is and where to get it (step-by-step: Supabase dashboard, Sentry, Google Cloud Console, Apple Developer, Expo/EAS).
3. After I reply, put the values in the correct places: local `.env`, **EAS secrets** (`eas secret:create` / `eas env:create`), and CI secrets instructions for GitHub Actions. **Never print secrets back in logs or commit them.**
4. Run the Supabase migrations against my project (or give me the exact commands), run a final verification (typecheck, tests, a production-profile build), and fix anything that breaks.
5. Produce the **final handoff**: a checklist of what is done, what I must do manually (Apple/Google developer accounts, store listings, screenshots, signing credentials), the exact commands to build the Android AAB and iOS IPA with EAS and submit them, and known limitations/next-step ideas.

---

## 9. Definition of Done

- App builds and runs on Android and iOS (dev build + production profile).
- Camera -> pose -> rep count -> form feedback -> voice works for all listed exercises, in guided and free mode, with measured FPS/latency documented.
- Unit tests for the domain engine pass with the replay fixtures; CI is green.
- Offline-first works; sync works; auth works; account deletion works.
- 10+ researched plans selectable, daily flow complete, history + weekly charts working.
- 40+ exercises each with detailed numbered steps, form cues, mistakes/fixes, variations and a smooth animated demo; research documented in `docs/CONTENT_RESEARCH.md`; content validation tests pass.
- UI is clean and consistent, built on the design system, with smooth 60fps animations (including Reduce Motion fallback) on every screen listed in Section 4A.
- Docs complete (architecture, design system, adding an exercise, adding a plan, release).
- Everything pushed to GitHub with clean history; `.env` handled as in Section 8.
- The codebase is modular enough that a new developer can add an exercise or a plan by following the docs in under 30 minutes.

Begin now: first ask me for the GitHub repo details, then start Phase 1. Give short status updates between phases, and do not stop until Section 9 is satisfied (except where blocked as described).
