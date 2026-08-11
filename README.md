# Expense Sharing (Splitwise-style POC)

A mobile app to create groups, add people, split expenses, simplify debts, and settle up.

**Stack:** Expo (React Native) + TypeScript · Supabase (Postgres + Auth + RLS) · TanStack Query.

## Prerequisites

- Node 18+ (tested on Node 20)
- The **Expo Go** app on your phone, or an Android emulator / iOS simulator
- A free **Supabase** account

## One-time setup

1. **Install dependencies** (already done if you cloned a ready tree):

   ```bash
   npm install
   ```

2. **Create a Supabase project** at https://supabase.com → New project.

3. **Add your keys.** In the dashboard: **Settings → API**. Copy the **Project URL** and the
   **anon public** key into a `.env` file (copy `.env.example`):

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-ref.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```

   > The anon key is safe to ship — access is controlled by Row Level Security.
   > **Never** put the `service_role` key in this app.

4. **Run the database migrations.** Dashboard → **SQL Editor** → New query → paste and **Run** each
   file in `supabase/migrations/` **in order**:
   - [`0001_init.sql`](supabase/migrations/0001_init.sql) — tables, RLS policies, new-user trigger
   - [`0002_groups_rpc.sql`](supabase/migrations/0002_groups_rpc.sql) — `create_group` + `find_user_by_email` RPCs (M2)
   - [`0003_member_delete_policy.sql`](supabase/migrations/0003_member_delete_policy.sql) — member-delete RLS: owner-or-self (M2)
   - [`0004_expenses_rpc.sql`](supabase/migrations/0004_expenses_rpc.sql) — `create_expense` + `update_expense` RPCs (M3)
   - [`0005_polish.sql`](supabase/migrations/0005_polish.sql) — `groups.simplify_debts` column + Realtime publication (M5)
   - [`0006_receipts.sql`](supabase/migrations/0006_receipts.sql) — `expenses.receipt_url` + `receipts` Storage bucket & policies (M6)
   - [`0007_sync_member_names.sql`](supabase/migrations/0007_sync_member_names.sql) — sync `group_members.display_name` to the linked profile's name

5. *(Optional, speeds up testing)* Dashboard → **Authentication → Providers → Email**: turn **off**
   "Confirm email" so sign-up logs you straight in without an email round-trip.

## Run

```bash
npx expo start -c
```

Then press `a` (Android emulator), `i` (iOS simulator), `w` (web), or scan the QR with Expo Go.
The `-c` clears the cache — always use it after changing `.env`.

## Verify auth works

- Sign up with an email + password → a row appears in **Authentication → Users** and in the
  `profiles` table.
- Sign out, sign back in.
- Killing/reopening the app keeps you signed in (session persisted).

## Test & typecheck

```bash
npm test          # unit tests for split + debt math
npm run typecheck # tsc --noEmit
```

## Project layout

```
src/
  app/                 # expo-router routes
    (auth)/            # sign-in, sign-up
    (app)/             # home (groups land here in M2)
  components/ui.tsx    # small themed UI kit
  lib/
    supabase.ts        # client (+ AsyncStorage session)
    auth.tsx           # AuthProvider / useAuth
    split.ts           # split calculators (integer minor units)
    debt.ts            # balances + debt simplification
  types/models.ts      # DB row shapes
supabase/migrations/   # SQL schema + RLS + trigger
```

## Milestone status

- ✅ **M0** Scaffold, config, DB schema/RLS
- ✅ **M1** Email/password auth
- ✅ **M2** Groups & members (create, add by email / manual / device contacts)
- ✅ **M3** Expenses & splits (equal / exact / percent / shares; add / edit / delete)
- ✅ **M4** Balances, debt simplification (min cash flow), settlements / settle-up
- ✅ **M5** Polish — Realtime live updates, persisted simplify toggle, activity feed, pull-to-refresh
- ✅ **M6** Receipt photos (Supabase Storage) + PDF summary export
