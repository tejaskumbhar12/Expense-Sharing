-- ============================================================================
-- M6 follow-up — keep group_members.display_name in sync with the linked user's
-- profile name, so every list (members, balances, expenses, payments, activity)
-- shows the real name once someone signs up, instead of the placeholder text
-- captured when they were added by email.
-- Run in Supabase dashboard SQL Editor after 0001-0006.
-- ============================================================================

-- 1) One-time backfill for members already linked to a named profile.
update public.group_members gm
set display_name = p.full_name
from public.profiles p
where gm.user_id = p.id
  and p.full_name is not null
  and length(trim(p.full_name)) > 0
  and gm.display_name is distinct from p.full_name;

-- 2) Keep it in sync going forward: when a profile's name is set/changed,
--    update that user's membership rows.
create or replace function public.sync_member_display_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.full_name is not null and length(trim(new.full_name)) > 0 then
    update public.group_members
      set display_name = new.full_name
      where user_id = new.id and display_name is distinct from new.full_name;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_name_sync on public.profiles;
create trigger on_profile_name_sync
  after insert or update of full_name on public.profiles
  for each row execute function public.sync_member_display_name();

-- 3) When a new signup links placeholder memberships by email, also set their
--    display_name from the new account's name (replaces the recreated 0001
--    trigger function).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name');
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, v_name)
  on conflict (id) do nothing;

  update public.group_members
    set user_id = new.id,
        display_name = coalesce(nullif(trim(v_name), ''), display_name)
    where user_id is null
      and email is not null
      and lower(email) = lower(new.email);

  return new;
end;
$$;
