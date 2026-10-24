# FormFit Design System

Everything visual comes from `src/ui` (public API: `@/ui`). Feature code never uses raw colors,
font sizes or ad-hoc animation values.

## Principles

- **Energetic but clean.** Near-black canvas, one electric "volt" accent, generous whitespace.
- **One primary action per screen.** The volt fill is reserved for it.
- **Readable from 2 m.** Rep counter 144 pt, timers 88 pt, tabular numerals.
- **Never color alone.** Selection uses fill + check icon; form warnings use color + text + voice.
- **Motion with purpose.** 150–350 ms, springs from tokens, UI-thread only, Reduce Motion respected.

## Tokens

| Group           | File                  | Notes                                                                                     |
| --------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| Palette         | `theme/palette.ts`    | Only place raw hex lives                                                                  |
| Semantic colors | `theme/colors.ts`     | `background`, `surface`, `text`, `accent`/`onAccent`/`accentText`, status, pose colors    |
| Typography      | `theme/typography.ts` | `counter`, `timer`, `displayL/M`, `h1-3`, `bodyL`, `body`, `label`, `caption`, `overline` |
| Spacing         | `theme/tokens.ts`     | 4/8 pt grid: `spacing[1]=4 … spacing[16]=64`                                              |
| Radii           | `theme/tokens.ts`     | `xs 6 · sm 10 · md 14 · lg 20 · xl 28 · pill`                                             |
| Elevation       | `theme/tokens.ts`     | `none · low · high` (used mainly in light mode)                                           |
| Motion          | `theme/motion.ts`     | durations, bezier easings, springs (`snappy`, `gentle`, `bouncy`), stagger                |

### Accent usage

- `accent` is a **fill**; text/icons on it use `onAccent`.
- For accent-colored **text** on a background use `accentText` (dark: volt, light: deep olive) — both
  pass AA. This is enforced by `src/ui/__tests__/tokens.test.ts`.

### Typography

Barlow Condensed (display/numerals) + Inter (UI). `Text` caps dynamic-type scaling per variant
(`maxFontSizeMultiplier`) so giant numerals never overflow, while body text scales up to 1.6×.

## Components

`Text`, `Icon`, `PressableScale`, `Button`, `Card`, `PlanCard`, `ExerciseTile`, `ProgressRing`,
`AnimatedCounter`, `StatTile`, `Chip`, `Tabs`, `Stepper`, `ListItem`, `SectionHeader`, `Skeleton`,
`EmptyState`, `ErrorState`, `Modal`, `BottomSheet`, `Toast` (`ToastProvider` + `useToast`),
`Countdown`, `Stagger`, `Screen`, `Switch`, `TextField`, `OptionCard` (radio/checkbox choice
cards), `BarChart` (bars grow in, tap for value, each bar labelled for screen readers), `Heatmap`
(training calendar), `PulseIcon` (streak flame), `Confetti` (session complete; skipped under
Reduce Motion).

A live gallery is available in dev builds: **Settings → Design system (dev)** (`/dev/design-system`).

## Motion guidelines

- Use `useMotion()` for entrances (`enterStagger(i)`, `enterFade`) and `timing()` / `spring()` for
  value animations. All include `ReduceMotion.System`.
- Press feedback: every tappable element is a `PressableScale` (scale 0.96 + haptic).
- Rep counter: `AnimatedCounter` pops (scale 1.18 → bouncy spring) on increments.
- Progress: `ProgressRing` animates with the `emphasized` duration and `decelerate` easing.
- Countdown: 3-2-1 zoom in/out per number; fade only under Reduce Motion.
- Decorative loops (`Skeleton` pulse, `EmptyState` float) are disabled under Reduce Motion.
- Never animate on the JS thread; read/write shared values with `.get()/.set()`.

## Accessibility checklist (per component)

- Role + label on every interactive element; state (`selected`, `disabled`, `busy`) exposed.
- 48 dp minimum touch target (`theme.hitTarget`).
- AA contrast for all token pairs (tested).
- Live regions for changing numbers (rep counter, countdown, toasts).

## Polish pass (Phase 8)

- Camera player: replaced the full-screen dim with top/bottom gradients (`CameraScrim`) so you can
  see your whole body while the header and controls stay legible.
- Set-complete celebration (`SetCompleteBurst`, spring check, fade under Reduce Motion); personal
  bests pulse on the summary.
- Offline pill (`OfflineBanner`) and a friendly crash screen (`AppErrorBoundary`).
- Every screen passes the automated accessibility audit; see `docs/ACCESSIBILITY.md`.
