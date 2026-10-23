# Accounts & auth

No sign-up wall: the first launch creates a **guest** so people can work out immediately.

| State           | How                                               | Data                                        |
| --------------- | ------------------------------------------------- | ------------------------------------------- |
| Local guest     | backend not configured or offline at first launch | SQLite only, id in MMKV `auth.localGuestId` |
| Anonymous guest | Supabase anonymous sign-in                        | synced under an anonymous user              |
| Account         | email 6-digit code, Google, Apple                 | synced; available on every device           |

- **Upgrade keeps data.** An anonymous user upgrades in place (`updateUser({ email })` →
  `verifyOtp({ type: 'email_change' })`), so the user id doesn't change. Any other transition
  (local guest → account, OAuth sign-in) reassigns local rows to the new user id
  (`reassignLocalUser`) and re-queues them in the outbox before syncing.
- **Google / Apple** use native id-token flows (`signInWithIdToken`); Apple uses a SHA-256 nonce.
  Buttons only appear when configured (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`) / available (iOS).
- **Session storage**: the Supabase session is AES-CTR-encrypted in MMKV with a random 256-bit
  key held in SecureStore (Keychain/Keystore), since SecureStore values are size-limited.
- **Sign out** syncs first, then wipes local data. Guests are warned that sign-out deletes data.
- **Delete account** (store requirement): `delete_my_account()` RPC removes the auth user and
  cascades all rows; local data is wiped. **Export** returns all the user's rows as JSON (server
  `export_my_data()` when signed in, local tables otherwise) and opens the share sheet.
