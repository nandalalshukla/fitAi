# Supabase backend

- `migrations/` — schema, RLS, LWW + `synced_at` triggers, account functions. Append-only.
- `config.toml` — local stack config (anonymous sign-ins and email OTP on; Google/Apple read
  secrets from env: `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_WEB_CLIENT_SECRET`, `APPLE_SERVICES_ID`,
  `APPLE_SIGNIN_SECRET`).
- `tests/` — `npm run test:db` runs the migrations on PGlite with a minimal `auth` shim
  (`tests/auth_shim.sql`, test-only) and asserts the RLS policies.

## Deploy

```sh
npx supabase link --project-ref "$SUPABASE_PROJECT_ID"
npx supabase db push            # applies migrations/
```

In the dashboard: enable **Anonymous sign-ins**, set the email template to send the 6-digit
`{{ .Token }}`, and add Google/Apple providers (Google: the _web_ client ID; add the iOS client ID
under "Authorized client IDs").
