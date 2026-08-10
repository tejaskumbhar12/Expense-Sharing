@AGENTS.md

# Expense Sharing — dev guide

Splitwise-style POC. **Expo (RN) + TypeScript + Supabase.** See `README.md` for setup.

## Commands

```bash
npx expo start -c   # run (clear cache; required after .env changes)
npm test            # jest unit tests (split/debt math)
npm run typecheck   # tsc --noEmit
npx expo export -p android --output-dir dist-verify   # headless bundle check
```

Node **≥20.19.4** required by Expo 57.

## Layout

- `src/app/` — expo-router routes. Groups: `(auth)` (signed-out) and `(app)` (signed-in).
  Root `src/app/_layout.tsx` wires providers (QueryClient, Auth) and the redirect gate.
- `src/lib/supabase.ts` — client; session persisted via AsyncStorage. `isSupabaseConfigured`
  is false while `.env` still holds the scaffold placeholders.
- `src/lib/auth.tsx` — `AuthProvider` + `useAuth()` (`session`, `user`, `loading`, `signOut`).
- `src/lib/split.ts` / `src/lib/debt.ts` — **pure**, unit-tested money logic.
- `src/components/ui.tsx` — themed primitives (Screen, AppText, Button, TextField, Card).
- `src/types/models.ts` — DB row shapes (hand-written; can swap for `supabase gen types`).
- `supabase/migrations/0001_init.sql` — schema + RLS + `handle_new_user` trigger.

## Conventions / decisions

- **Money = integer minor units** (cents/paise) everywhere in `split.ts`/`debt.ts`; convert with
  `toMinor`/`fromMinor` only at the UI/DB edge. Splits always sum exactly to the total.
- **Balance sign:** `+` means the group owes the member (creditor), `−` means they owe.
- **RLS** is gated by `SECURITY DEFINER` helpers (`is_group_member`, `is_group_owner`,
  `shares_group_with`) to avoid policy recursion. Add new group-scoped tables the same way.
- **Members can be placeholders** (`group_members.user_id` null) until the person signs up; the
  signup trigger auto-links them by email.
- Path alias `@/*` → `src/*` (also mapped in jest `moduleNameMapper`).
- Deliberately **no external UI kit** and **no RHF/zod resolver** yet (React 19.2 peer-dep caution);
  auth forms use plain state. `typedRoutes` is off to keep tsc clean without generated route types.

## Status

M0 (scaffold/config/schema), M1 (auth), M2 (groups & members) done. Next: **M3 expenses & splits**.

- M2 adds `create_group` + `find_user_by_email` RPCs in `supabase/migrations/0002_groups_rpc.sql`
  (must be run in the dashboard). App uses a `(tabs)` layout (Groups / Account); group create,
  detail, and add-member (email lookup / manual / `expo-contacts`) live under `src/app/(app)/`.
- Data access via React Query hooks in `src/lib/queries/`.
- For a dev/prod build (not Expo Go), add the `expo-contacts` config plugin to `app.json` for the
  contacts permission prompt.
