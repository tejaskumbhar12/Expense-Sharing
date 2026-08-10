-- ============================================================================
-- M2 — groups & members: helper RPCs
-- Run in Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Requires 0001_init.sql to have been run first.
-- ============================================================================

-- Create a group and add the caller as its owner member, atomically.
-- SECURITY DEFINER so the owner-membership insert isn't blocked by the
-- "must already be a member" bootstrap on group_members.
create or replace function public.create_group(p_name text, p_currency text default 'INR')
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  my_name text;
  my_email text;
  g public.groups;
begin
  if me is null then
    raise exception 'Not authenticated';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Group name is required';
  end if;

  select full_name, email into my_name, my_email
  from public.profiles where id = me;

  insert into public.groups (name, created_by, currency)
  values (trim(p_name), me, coalesce(nullif(trim(p_currency), ''), 'INR'))
  returning * into g;

  insert into public.group_members (group_id, user_id, display_name, email, role)
  values (g.id, me, coalesce(nullif(trim(my_name), ''), my_email, 'You'), my_email, 'owner');

  return g;
end;
$$;

-- Look up a registered user by email so an existing account can be linked to a
-- new membership. SECURITY DEFINER intentionally exposes only id + name + email
-- (no other profile data) past the profiles RLS policy.
create or replace function public.find_user_by_email(p_email text)
returns table (id uuid, full_name text, email text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.full_name, p.email
  from public.profiles p
  where lower(p.email) = lower(trim(p_email))
  limit 1;
$$;

grant execute on function public.create_group(text, text) to authenticated;
grant execute on function public.find_user_by_email(text) to authenticated;
