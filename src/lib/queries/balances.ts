import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { computeBalances, pairwiseDebts, simplifyDebts } from '@/lib/debt';
import { toMinor } from '@/lib/split';
import type { GroupMember } from '@/types/models';

import { qk } from './keys';

export interface MemberBalanceView {
  member: GroupMember;
  balanceMinor: number;
}
export interface TransferView {
  from: GroupMember;
  to: GroupMember;
  amountMinor: number;
}
export interface GroupBalances {
  balances: MemberBalanceView[];
  /** Minimised transactions (simplify debts ON). */
  transfers: TransferView[];
  /** Direct per-pair debts (simplify debts OFF). */
  directTransfers: TransferView[];
}

/**
 * Fetch a group's members, expenses (+ splits), and settlements, then derive
 * per-member net balances and the simplified who-pays-whom transfers using the
 * pure helpers in lib/debt.ts.
 */
export function useGroupBalances(groupId: string) {
  return useQuery({
    queryKey: qk.balances(groupId),
    enabled: !!groupId,
    queryFn: async (): Promise<GroupBalances> => {
      const [membersRes, expensesRes, settlementsRes] = await Promise.all([
        supabase.from('group_members').select('*').eq('group_id', groupId).order('joined_at'),
        supabase
          .from('expenses')
          .select('paid_by, amount, expense_splits(member_id, amount_owed)')
          .eq('group_id', groupId),
        supabase.from('settlements').select('from_member, to_member, amount').eq('group_id', groupId),
      ]);
      if (membersRes.error) throw membersRes.error;
      if (expensesRes.error) throw expensesRes.error;
      if (settlementsRes.error) throw settlementsRes.error;

      const members = (membersRes.data ?? []) as GroupMember[];
      const expenseRows = (expensesRes.data ?? []) as any[];
      const settlementRows = (settlementsRes.data ?? []) as any[];

      const balances = computeBalances({
        memberIds: members.map((m) => m.id),
        expenses: expenseRows.map((e) => ({ paidBy: e.paid_by, amountMinor: toMinor(Number(e.amount)) })),
        splits: expenseRows.flatMap((e) =>
          (e.expense_splits ?? []).map((s: any) => ({
            memberId: s.member_id,
            amountOwedMinor: toMinor(Number(s.amount_owed)),
          }))
        ),
        settlements: settlementRows.map((s) => ({
          fromMember: s.from_member,
          toMember: s.to_member,
          amountMinor: toMinor(Number(s.amount)),
        })),
      });

      const byId = new Map(members.map((m) => [m.id, m]));
      const toViews = (list: { from: string; to: string; amountMinor: number }[]) =>
        list
          .map((t) => ({ from: byId.get(t.from), to: byId.get(t.to), amountMinor: t.amountMinor }))
          .filter((t): t is TransferView => !!t.from && !!t.to);

      const transfers = toViews(simplifyDebts(balances));
      const directTransfers = toViews(
        pairwiseDebts({
          expenses: expenseRows.map((e) => ({
            paidBy: e.paid_by,
            splits: (e.expense_splits ?? []).map((s: any) => ({
              memberId: s.member_id,
              amountOwedMinor: toMinor(Number(s.amount_owed)),
            })),
          })),
          settlements: settlementRows.map((s) => ({
            fromMember: s.from_member,
            toMember: s.to_member,
            amountMinor: toMinor(Number(s.amount)),
          })),
        })
      );

      return {
        balances: balances
          .map((b) => ({ member: byId.get(b.memberId), balanceMinor: b.balanceMinor }))
          .filter((b): b is MemberBalanceView => !!b.member),
        transfers,
        directTransfers,
      };
    },
  });
}
