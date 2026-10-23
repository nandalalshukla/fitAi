# Adding a plan

Plans live in `src/content/plans/*.ts` as a `PlanSource` (see `src/content/schema.ts`) and are
compiled into a day-by-day schedule by `compilePlan` (`src/content/compile.ts`).

1. Create `src/content/plans/myPlan.ts` exporting a `PlanSource`:
   - `sessions`: templates keyed by letter (`A`, `B`, …). Each starts with a `warmup` block, has at
     least one `main` block, an optional `finisher`, and ends with a `cooldown`.
   - Items: `exerciseId` (must exist in the catalog), `sets`, **either** `reps` **or** `seconds`,
     `restS` (after each set), optional `tempo` (`"3-1-1"`), `fixed: true` to exclude from progression.
   - `weekPattern`: 7 entries, each a session key, `'rest'` or `'active_recovery'`
     (`activeRecoverySession` names the template used for recovery days). Optional
     `weekPatternOverrides` per week (e.g. alternate A/B order).
   - `progression`: `volumePerWeek` (0.05 = +5 % reps/seconds per week), `addSetEveryWeeks`,
     `maxSets`, `restPerWeekS` (≤ 0), `minRestS`, `deloadWeeks`, `deloadFactor`.
   - Honest `whatToExpect` lines and `safetyNotes`.
2. Register it in `src/content/plans/index.ts`.
3. Run `npx jest src/content`. The tests check the schema, that every day has exercises, that each
   week has a rest/recovery day, that volume progresses and deload weeks are lighter, and that
   every session's estimated length (work + rests + 15 s per exercise) is within ±15 % of
   `minutesPerSession`. Adjust sets/rests until it passes.

Session length estimate: `15 s + sets × (work + rest)` per exercise, where work is `seconds`, or
`reps × repSeconds` from the exercise catalog (doubled for per-side exercises).
