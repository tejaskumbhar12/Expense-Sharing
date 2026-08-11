-- ============================================================================
-- M5 — polish: persisted per-group "simplify debts" setting + Realtime
-- Run in Supabase dashboard SQL Editor after 0001-0004.
-- ============================================================================

-- Per-group toggle for how settle-up suggestions are computed.
alter table public.groups
  add column if not exists simplify_debts boolean not null default true;

-- Enable Realtime change streams on the group-scoped tables. RLS still governs
-- which rows each client receives. Idempotent: skips tables already published.
do $$
declare
  t text;
begin
  foreach t in array array['groups', 'group_members', 'expenses', 'settlements'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
