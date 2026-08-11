import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { GroupMember } from '@/types/models';

import { qk } from './keys';

export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: qk.members(groupId),
    enabled: !!groupId,
    queryFn: async (): Promise<GroupMember[]> => {
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as GroupMember[];
    },
  });
}

export interface FoundUser {
  id: string;
  full_name: string | null;
  email: string | null;
}

/** Find a registered user by email (via SECURITY DEFINER RPC). null if none. */
export async function findUserByEmail(email: string): Promise<FoundUser | null> {
  const { data, error } = await supabase.rpc('find_user_by_email', { p_email: email });
  if (error) throw error;
  const rows = (data ?? []) as FoundUser[];
  return rows[0] ?? null;
}

export interface AddMemberInput {
  display_name: string;
  email?: string | null;
  phone?: string | null;
  /** Set when linking an existing registered user; null for a placeholder. */
  user_id?: string | null;
}

export function useAddMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddMemberInput) => {
      const { error } = await supabase.from('group_members').insert({
        group_id: groupId,
        user_id: input.user_id ?? null,
        display_name: input.display_name.trim(),
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        role: 'member',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.members(groupId) });
      queryClient.invalidateQueries({ queryKey: qk.groups });
      queryClient.invalidateQueries({ queryKey: ['known-people'] });
    },
  });
}

export function useRemoveMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase.from('group_members').delete().eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.members(groupId) });
      queryClient.invalidateQueries({ queryKey: qk.groups });
      queryClient.invalidateQueries({ queryKey: ['known-people'] });
    },
  });
}

/** Current user leaves a group (removes their own membership). */
export function useLeaveGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.members(groupId) });
      queryClient.invalidateQueries({ queryKey: qk.groups });
      queryClient.invalidateQueries({ queryKey: ['known-people'] });
    },
  });
}
