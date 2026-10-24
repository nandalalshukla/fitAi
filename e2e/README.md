# End-to-end tests (Maestro)

Black-box flows that drive a real build on a simulator/emulator or device through the same
`testID`s the Jest navigation tests use.

| Flow          | Covers                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------ |
| `smoke.yaml`  | First launch → onboarding → Today → start workout (camera denied → manual) → end → summary |
| `browse.yaml` | Plan detail + switch plan, exercise search → animated guide (step-synced)                  |

## Run

1. Install Maestro: `curl -Ls "https://get.maestro.mobile.dev" | bash`
2. Install a dev build on a booted simulator/emulator: `npx expo run:ios` or `npx expo run:android`
   (bundle id `com.formfit.app.dev`; set `APP_ID` for other variants).
3. `npm run test:e2e` (all flows) or `maestro test e2e/smoke.yaml`.

These flows cannot run in the cloud CI container (no simulator); run them locally before each
release (see `docs/RELEASE.md`), or add a Maestro Cloud / EAS Workflows job.
