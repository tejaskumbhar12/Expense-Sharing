-- ============================================================================
-- Allow ANY group member to remove members (not just the owner), while keeping
-- the owner un-removable (the owner leaves by deleting the group). The
-- "must be settled up" rule is enforced in the app UI.
-- Run in Supabase dashboard SQL Editor after 0001-0007.
-- ============================================================================

drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members
  for delete using (
    public.is_group_member(group_id) and role <> 'owner'
  );
