# Crash reporting & analytics

Both are **off unless their public keys are set** (`EXPO_PUBLIC_SENTRY_DSN`,
`EXPO_PUBLIC_ANALYTICS_KEY` + `EXPO_PUBLIC_ANALYTICS_HOST`), and one switch in
**Settings → Privacy → Share anonymous usage & crash data** turns both off at runtime.

## Crash reporting (Sentry)

- `src/core/observability/crashReporting.ts`: init with `sendDefaultPii: false`, no screenshots or
  view hierarchy, user/request removed, messages/extra/contexts/breadcrumbs scrubbed.
- The central logger gets a Sentry sink: `info`/`warn` → breadcrumbs, `error` → events.
- `AppErrorBoundary` catches render crashes, shows a friendly retry screen and reports through the logger.
- Source maps: `metro.config.js` uses `getSentryExpoConfig` (debug IDs); the `@sentry/react-native/expo`
  plugin is added when `SENTRY_ORG`/`SENTRY_PROJECT` are set, with `SENTRY_AUTH_TOKEN` as an EAS secret.

## Analytics (PostHog-compatible HTTP, no SDK)

- `src/core/analytics/httpAnalytics.ts`: batches to `POST {host}/batch/`, flushes every 30 s and when
  the app backgrounds, re-queues failed batches, drops the queue on opt-out.
- Identity: random per-install id (`installId()`), never the account id or email.
- Screen views: route pathname only.

### Event taxonomy (`src/core/analytics/events.ts`)

| Event                              | Properties                               |
| ---------------------------------- | ---------------------------------------- |
| `onboarding_completed`             | goal, level, plan, reminders             |
| `plan_enrolled`                    | plan, switched                           |
| `workout_started`                  | mode, plan, camera, resumed              |
| `workout_finished`                 | status, sets, reps, minutes, camera_sets |
| `rest_day_completed`               | plan                                     |
| `account_signed_in`                | provider, upgraded_guest                 |
| `account_deleted`, `data_exported` | —                                        |
| `reminders_changed`                | daily, streak                            |
| `camera_unavailable`               | reason                                   |

Adding an event = adding it to `AnalyticsEvents` (typed `track()` rejects anything else).
