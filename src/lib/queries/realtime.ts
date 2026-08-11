import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';

import { qk } from './keys';

/**
 * Subscribe to Realtime changes for a single group and invalidate the relevant
 * React Query caches so the UI updates live. RLS still governs which rows the
 * client is allowed to receive. Requires the tables to be in the
 * `supabase_realtime` publication (see migration 0005).
 */
export function useGroupRealtime(groupId: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!groupId) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: qk.expenses(groupId) });
      queryClient.invalidateQueries({ queryKey: qk.balances(groupId) });
      queryClient.invalidateQueries({ queryKey: qk.members(groupId) });
      queryClient.invalidateQueries({ queryKey: qk.settlements(groupId) });
      queryClient.invalidateQueries({ queryKey: qk.group(groupId) });
      queryClient.invalidateQueries({ queryKey: qk.activity });
    };

    const channel = supabase
      .channel(`group-${groupId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `group_id=eq.${groupId}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements', filter: `group_id=eq.${groupId}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `group_id=eq.${groupId}` }, invalidate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups', filter: `id=eq.${groupId}` }, invalidate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, queryClient]);
}

/** Refresh the groups list when the user's memberships change. */
export function useGroupsRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId) return;

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: qk.groups });
      queryClient.invalidateQueries({ queryKey: qk.activity });
    };

    const channel = supabase
      .channel(`groups-of-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members', filter: `user_id=eq.${userId}` }, invalidate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
