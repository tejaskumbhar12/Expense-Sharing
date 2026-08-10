-- ============================================================================
-- Expense Sharing (Splitwise-style) — initial schema
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run (idempotent-ish: uses IF NOT EXISTS / CREATE OR REPLACE).
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

-- Mirror of auth.users with app-facing profile fields.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);

create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null references auth.users (id) on delete restrict,
  currency    text not null default 'INR',
  created_at  timestamptz not null default now()
);

-- A member may be a registered user (user_id set) OR a placeholder someone
-- added by name/email/phone before they signed up (user_id null).
create table if not exists public.group_members (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid not null references public.groups (id) on delete cascade,
  user_id       uuid references auth.users (id) on delete set null,
  display_name  text not null,
  email         text,
  phone         text,
  role          text not null default 'member' check (role in ('owner', 'member')),
  joined_at     timestamptz not null default now(),
  -- a registered user can appear at most once per group
  constraint group_members_unique_user unique (group_id, user_id)
);

create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  description text not null,
  amount      numeric(12, 2) not null check (amount > 0),
  currency    text not null default 'INR',
  paid_by     uuid not null references public.group_members (id) on delete restrict,
  split_type  text not null default 'equal' check (split_type in ('equal', 'exact', 'percent', 'shares')),
  spent_at    date not null default current_date,
  created_by  uuid not null references auth.users (id) on delete set null,
  notes       text,
  created_at  timestamptz not null default now()
);

-- One row per participant. SUM(amount_owed) for an expense = expenses.amount.
create table if not exists public.expense_splits (
  id            uuid primary key default gen_random_uuid(),
  expense_id    uuid not null references public.expenses (id) on delete cascade,
  member_id     uuid not null references public.group_members (id) on delete cascade,
  amount_owed   numeric(12, 2) not null check (amount_owed >= 0),
  share         numeric(12, 4), -- optional metadata: percent or share weight
  constraint expense_splits_unique_member unique (expense_id, member_id)
);

-- A cash payment from one member to another to clear debt.
create table if not exists public.settlements (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references public.groups (id) on delete cascade,
  from_member uuid not null references public.group_members (id) on delete restrict,
  to_member   uuid not null references public.group_members (id) on delete restrict,
  amount      numeric(12, 2) not null check (amount > 0),
  settled_at  date not null default current_date,
  note        text,
  created_at  timestamptz not null default now(),
  constraint settlements_distinct_members check (from_member <> to_member)
);

-- Indexes for common lookups
create index if not exists idx_group_members_group on public.group_members (group_id);
create index if not exists idx_group_members_user  on public.group_members (user_id);
create index if not exists idx_expenses_group       on public.expenses (group_id);
create index if not exists idx_expense_splits_exp   on public.expense_splits (expense_id);
create index if not exists idx_settlements_group    on public.settlements (group_id);

-- ----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid RLS recursion in policies)
-- ----------------------------------------------------------------------------

create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members m
    where m.group_id = gid and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_group_owner(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.groups g
    where g.id = gid and g.created_by = auth.uid()
  );
$$;

create or replace function public.shares_group_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.profiles       enable row level security;
alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.expenses       enable row level security;
alter table public.expense_splits enable row level security;
alter table public.settlements    enable row level security;

-- profiles: read self + anyone you share a group with; edit only self
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.shares_group_with(id));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- groups: members can read; any authenticated user can create (as themselves);
-- members can update; only the creator can delete
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups
  for select using (public.is_group_member(id));

drop policy if exists groups_insert on public.groups;
create policy groups_insert on public.groups
  for insert with check (created_by = auth.uid());

drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups
  for update using (public.is_group_member(id)) with check (public.is_group_member(id));

drop policy if exists groups_delete on public.groups;
create policy groups_delete on public.groups
  for delete using (public.is_group_owner(id));

-- group_members: members can read/manage; the group owner can add the first
-- members (bootstrapping, before is_group_member would be true)
drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members
  for select using (public.is_group_member(group_id));

drop policy if exists group_members_insert on public.group_members;
create policy group_members_insert on public.group_members
  for insert with check (public.is_group_owner(group_id) or public.is_group_member(group_id));

drop policy if exists group_members_update on public.group_members;
create policy group_members_update on public.group_members
  for update using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));

drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members
  for delete using (public.is_group_member(group_id));

-- expenses: full access to group members
drop policy if exists expenses_all on public.expenses;
create policy expenses_all on public.expenses
  for all using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));

-- expense_splits: gated on membership of the parent expense's group
drop policy if exists expense_splits_all on public.expense_splits;
create policy expense_splits_all on public.expense_splits
  for all
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_group_member(e.group_id)
    )
  )
  with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_group_member(e.group_id)
    )
  );

-- settlements: full access to group members
drop policy if exists settlements_all on public.settlements;
create policy settlements_all on public.settlements
  for all using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));

-- ----------------------------------------------------------------------------
-- Grants (RLS still enforces row visibility; this exposes tables to the API
-- for the signed-in `authenticated` role only — never `anon`).
-- ----------------------------------------------------------------------------

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles, public.groups, public.group_members,
  public.expenses, public.expense_splits, public.settlements
  to authenticated;
grant execute on function
  public.is_group_member(uuid),
  public.is_group_owner(uuid),
  public.shares_group_with(uuid)
  to authenticated;

-- ----------------------------------------------------------------------------
-- New-user trigger: create a profile row and auto-link any placeholder
-- group memberships that were created for this person's email.
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;

  update public.group_members
    set user_id = new.id
    where user_id is null
      and email is not null
      and lower(email) = lower(new.email);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
