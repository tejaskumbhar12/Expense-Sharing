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

M0-M6 done — full POC. Auth, groups/members, expenses/splits, balances + debt-simplify +
settlements, polish (Realtime, persisted simplify toggle, activity feed, pull-to-refresh), and
receipts + CSV export.

- M6: `src/lib/receipts.ts` (expo-image-picker + upload to the public `receipts` Storage bucket;
  path `<group_id>/<ts>.jpg`, membership-gated by 0006); expense hooks patch `receipt_url` after the
  RPC. `src/lib/pdf.ts` renders a group summary (balances + expenses + payments) to PDF via
  expo-print + expo-sharing (native) / print-save (web). Migration 0006 adds the column +
  bucket/policies.
- Member names: `group_members.display_name` starts as placeholder text (e.g. added-by-email).
  Migration 0007 keeps it synced to the linked user's `profiles.full_name` (backfill + trigger on
  profiles + updated `handle_new_user`), so real names show everywhere once a person signs up.

- M5: `src/lib/queries/realtime.ts` subscribes to Realtime and invalidates React Query;
  `groups.simplify_debts` (migration 0005) persists the toggle via `useUpdateGroupSettings`;
  `src/lib/queries/activity.ts` + `(tabs)/activity.tsx` merge recent expenses + payments across
  groups. Realtime needs tables in the `supabase_realtime` publication (0005).

- Balances derived client-side in `src/lib/queries/balances.ts` via `computeBalances` +
  `simplifyDebts` (`src/lib/debt.ts`); settlements via `src/lib/queries/settlements.ts`. Group
  detail shows per-member net, suggested transfers (quick-settle), and a payments list; settle-up
  screen at `group/[id]/settle.tsx` (prefilled from a suggested transfer). No new migration —
  settlements table + RLS shipped in 0001.

- SQL RPCs live in `supabase/migrations/` (run in dashboard, in order): `create_group` +
  `find_user_by_email` (0002), member-delete policy (0003), `create_expense` + `update_expense`
  (0004, atomic expense+splits, validates sum == amount).
- App uses a `(tabs)` layout (Groups / Account). Group create/detail/add-member and expense
  add-edit/detail live under `src/app/(app)/group/[id]/`.
- `src/components/SplitEditor.tsx` drives all 4 split types via `src/lib/split.ts` (minor units).
- Data access via React Query hooks in `src/lib/queries/`.
- Web quirks handled: RN `Alert` is a no-op on web → use `src/lib/confirm.ts`; web modals/detail get
  inline Cancel/Back controls (native uses the header).
- For a dev/prod build (not Expo Go), add the `expo-contacts` config plugin to `app.json`.
