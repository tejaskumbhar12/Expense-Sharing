import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Group } from '@/types/models';

import { qk } from './keys';

export interface GroupWithCount extends Group {
  memberCount: number;
}

/** Groups the signed-in user belongs to (enforced by RLS), newest first. */
export function useGroups() {
  return useQuery({
    queryKey: qk.groups,
    queryFn: async (): Promise<GroupWithCount[]> => {
      const { data, error } = await supabase
        .from('groups')
        .select('*, group_members(count)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => {
        const { group_members, ...group } = row;
        return { ...group, memberCount: group_members?.[0]?.count ?? 0 } as GroupWithCount;
      });
    },
  });
}

export function useGroup(id: string) {
  return useQuery({
    queryKey: qk.group(id),
    enabled: !!id,
    queryFn: async (): Promise<Group> => {
      const { data, error } = await supabase.from('groups').select('*').eq('id', id).single();
      if (error) throw error;
      return data as Group;
    },
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; currency: string }): Promise<Group> => {
      const { data, error } = await supabase.rpc('create_group', {
        p_name: input.name,
        p_currency: input.currency,
      });
      if (error) throw error;
      return data as Group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.groups });
    },
  });
}

/** Delete a group (RLS allows the owner only). Cascades members/expenses. */
export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('groups').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.groups });
    },
  });
}
