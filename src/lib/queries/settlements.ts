import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Settlement } from '@/types/models';

import { qk } from './keys';

export interface SettlementView extends Settlement {
  from: { display_name: string } | null;
  to: { display_name: string } | null;
}

export function useSettlements(groupId: string) {
  return useQuery({
    queryKey: qk.settlements(groupId),
    enabled: !!groupId,
    queryFn: async (): Promise<SettlementView[]> => {
      const { data, error } = await supabase
        .from('settlements')
        .select(
          '*, from:group_members!settlements_from_member_fkey(display_name), ' +
            'to:group_members!settlements_to_member_fkey(display_name)'
        )
        .eq('group_id', groupId)
        .order('settled_at', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SettlementView[];
    },
  });
}

export interface SettlementInput {
  from_member: string;
  to_member: string;
  amount: number;
  settled_at: string;
  note?: string | null;
}

export function useCreateSettlement(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SettlementInput) => {
      const { error } = await supabase.from('settlements').insert({
        group_id: groupId,
        from_member: input.from_member,
        to_member: input.to_member,
        amount: input.amount,
        settled_at: input.settled_at,
        note: input.note?.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.settlements(groupId) });
      queryClient.invalidateQueries({ queryKey: qk.balances(groupId) });
    },
  });
}

export function useDeleteSettlement(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settlementId: string) => {
      const { error } = await supabase.from('settlements').delete().eq('id', settlementId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.settlements(groupId) });
      queryClient.invalidateQueries({ queryKey: qk.balances(groupId) });
    },
  });
}
