-- ============================================================================
-- M2 follow-up — tighten who can remove group members.
-- Run in Supabase dashboard SQL Editor after 0001 + 0002.
--
-- Before: any group member could delete any membership row.
-- After:  only the group owner can remove members, and a member may remove
--         their own membership (i.e. leave the group).
-- (Group deletion stays owner-only via the groups_delete policy in 0001.)
-- ============================================================================

drop policy if exists group_members_delete on public.group_members;
create policy group_members_delete on public.group_members
  for delete using (
    public.is_group_owner(group_id) or user_id = auth.uid()
  );
