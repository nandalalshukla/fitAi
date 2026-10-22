# Contributing to FormFit

## Setup

```bash
npm ci
cp .env.example .env   # fill in values (all optional for local UI work)
npm run android        # or: npm run ios  (requires a development build, not Expo Go)
```

## Workflow

- Branch from the default branch; open a PR with the template filled in.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org) — enforced by commitlint
  (e.g. `feat(pose): add MoveNet estimator`, `fix(rep-counter): debounce bottom phase`).
- Husky runs ESLint + Prettier on staged files (`pre-commit`) and commitlint (`commit-msg`).

## Quality gate (must pass before every push)

```bash
npm run lint && npm run typecheck && npm test
```

## Code rules

- TypeScript `strict`, no `any`. Use the `@/` path alias for `src/`.
- Screens/features use design-system tokens from `@/ui` only — raw hex colors are a lint error.
- Domain logic (geometry, rep counters, form rules) stays free of React/React Native imports.
- Every user-facing string goes through i18n (`src/i18n/locales/en.ts`).
- Tappable elements use `PressableScale` (press feedback + haptic, 48dp minimum target).
- Respect Reduce Motion: use `useMotion()` helpers rather than hand-rolled animations.

See `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md` and `docs/DECISIONS.md`.
