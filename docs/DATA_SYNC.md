# Data & sync

FormFit is **offline-first**: every screen reads and writes the local SQLite database; the network
is only used to back data up and share it between a user's devices.

## Layers

```
screens ─▶ repositories (src/data/repositories) ─▶ SqlDatabase (expo-sqlite / sql.js in tests)
                         │ writeSynced(): row + outbox entry in one transaction
                         ▼
                 SyncEngine (src/data/sync) ◀──▶ RemoteStore (Supabase PostgREST)
```

- **Tables** (`src/data/schema/tables.ts`): `profiles`, `user_settings`, `plan_enrollments`,
  `workout_sessions`, `workout_sets`. Every row has `id` (uuid), `user_id`, `updated_at`,
  `synced_at`, `deleted_at`. Deletes are tombstones (`deleted_at`) so they sync.
- **Outbox**: one entry per pending record (re-writes bump `seq`). An entry is removed only if
  its `seq` is unchanged after a successful push, so edits made mid-push are never lost.
- **Local migrations**: `src/data/db/migrations.ts`, versioned with `PRAGMA user_version`.
  Append-only — never edit a shipped migration.

## Sync algorithm

`SyncEngine.sync(userId)` is single-flight (concurrent calls share one run):

1. **Push** outbox in FK order (`SYNC_ORDER`). If a table fails, later tables wait (a set never
   arrives before its session). Failures back off exponentially (2 s → 5 min cap).
2. **Pull** each table where `synced_at > cursor` (cursor key `pull:<user>:<table>`), in pages,
   applying rows locally with last-writer-wins on `updated_at`. Rows with pending local edits
   are left alone; the push wins next round.

Conflict rule: **last writer wins by client `updated_at`**, enforced on the server by the
`lww_guard` trigger (stale writes are dropped silently) and locally during pull. The server stamps
`synced_at = now()` on every accepted write; clients use it only as a pull cursor, so client clock
skew can't make anyone miss rows.

Triggers (`DataProvider`): app start, sign-in, reconnect (NetInfo), app foreground, every 5 min,
and ~2 s after local writes (`requestSync`). After a pull that changed rows, TanStack Query
caches are invalidated.

## Backend

`backend/supabase/` — migrations, `config.toml`, RLS tests. See `backend/supabase/README.md`.

## Testing

- `src/data/__tests__` — repositories and sync against sql.js and an in-memory fake server
  (two devices, offline, conflicts, paging, mid-push edits).
- `npm run test:db` — the real migrations on PGlite (Postgres in WASM) with an `auth` shim:
  RLS isolation, LWW, single active plan, export scoping, account delete cascade, anon denial.
