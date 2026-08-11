import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { toMinor } from '@/lib/split';

import { qk } from './keys';

export interface ActivityItem {
  kind: 'expense' | 'settlement';
  id: string;
  createdAt: string;
  groupId: string;
  groupName: string;
  title: string;
  subtitle: string;
  amountMinor: number;
  currency: string;
}

/** Recent expenses + payments across all of the user's groups, newest first. */
export function useActivity() {
  return useQuery({
    queryKey: qk.activity,
    queryFn: async (): Promise<ActivityItem[]> => {
      const [expRes, setRes] = await Promise.all([
        supabase
          .from('expenses')
          .select(
            'id, description, amount, currency, created_at, group_id, groups(name, currency), ' +
              'payer:group_members!expenses_paid_by_fkey(display_name)'
          )
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('settlements')
          .select(
            'id, amount, created_at, group_id, groups(name, currency), ' +
              'from:group_members!settlements_from_member_fkey(display_name), ' +
              'to:group_members!settlements_to_member_fkey(display_name)'
          )
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      if (expRes.error) throw expRes.error;
      if (setRes.error) throw setRes.error;

      const expenses = (expRes.data ?? []).map((e: any): ActivityItem => ({
        kind: 'expense',
        id: e.id,
        createdAt: e.created_at,
        groupId: e.group_id,
        groupName: e.groups?.name ?? 'Group',
        title: e.description,
        subtitle: `${e.payer?.display_name ?? 'someone'} paid · ${e.groups?.name ?? ''}`,
        amountMinor: toMinor(Number(e.amount)),
        currency: e.currency ?? e.groups?.currency ?? 'INR',
      }));

      const settlements = (setRes.data ?? []).map((s: any): ActivityItem => ({
        kind: 'settlement',
        id: s.id,
        createdAt: s.created_at,
        groupId: s.group_id,
        groupName: s.groups?.name ?? 'Group',
        title: `${s.from?.display_name ?? '?'} → ${s.to?.display_name ?? '?'}`,
        subtitle: `Payment · ${s.groups?.name ?? ''}`,
        amountMinor: toMinor(Number(s.amount)),
        currency: s.groups?.currency ?? 'INR',
      }));

      return [...expenses, ...settlements]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 50);
    },
  });
}
