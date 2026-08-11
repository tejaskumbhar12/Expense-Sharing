import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Expense, ExpenseSplit, SplitType } from '@/types/models';

import { qk } from './keys';

export interface ExpenseWithPayer extends Expense {
  payer: { display_name: string } | null;
}

export interface ExpenseDetail extends Expense {
  payer: { display_name: string } | null;
  splits: (ExpenseSplit & { member: { display_name: string } | null })[];
}

export interface ExpenseSplitInput {
  member_id: string;
  amount: number; // major units (e.g. 12.50)
  share?: number | null;
}

export interface ExpenseFormInput {
  description: string;
  amount: number;
  currency: string;
  paid_by: string;
  split_type: SplitType;
  spent_at: string; // YYYY-MM-DD
  notes?: string | null;
  receipt_url?: string | null;
  splits: ExpenseSplitInput[];
}

export function useExpenses(groupId: string) {
  return useQuery({
    queryKey: qk.expenses(groupId),
    enabled: !!groupId,
    queryFn: async (): Promise<ExpenseWithPayer[]> => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*, payer:group_members!expenses_paid_by_fkey(display_name)')
        .eq('group_id', groupId)
        .order('spent_at', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ExpenseWithPayer[];
    },
  });
}

export function useExpense(expenseId: string) {
  return useQuery({
    queryKey: qk.expense(expenseId),
    enabled: !!expenseId,
    queryFn: async (): Promise<ExpenseDetail> => {
      const { data, error } = await supabase
        .from('expenses')
        .select(
          '*, payer:group_members!expenses_paid_by_fkey(display_name), ' +
            'splits:expense_splits(*, member:group_members!expense_splits_member_id_fkey(display_name))'
        )
        .eq('id', expenseId)
        .single();
      if (error) throw error;
      return data as unknown as ExpenseDetail;
    },
  });
}

export function useCreateExpense(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExpenseFormInput): Promise<Expense> => {
      const { data, error } = await supabase.rpc('create_expense', {
        p_group_id: groupId,
        p_description: input.description,
        p_amount: input.amount,
        p_currency: input.currency,
        p_paid_by: input.paid_by,
        p_split_type: input.split_type,
        p_spent_at: input.spent_at,
        p_notes: input.notes ?? null,
        p_splits: input.splits,
      });
      if (error) throw error;
      const expense = data as Expense;
      if (input.receipt_url) {
        const { error: patchError } = await supabase
          .from('expenses')
          .update({ receipt_url: input.receipt_url })
          .eq('id', expense.id);
        if (patchError) throw patchError;
      }
      return expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.expenses(groupId) });
      queryClient.invalidateQueries({ queryKey: qk.group(groupId) });
      queryClient.invalidateQueries({ queryKey: qk.balances(groupId) });
      queryClient.invalidateQueries({ queryKey: qk.activity });
    },
  });
}

export function useUpdateExpense(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: { expenseId: string; input: ExpenseFormInput }): Promise<Expense> => {
      const { input } = args;
      const { data, error } = await supabase.rpc('update_expense', {
        p_expense_id: args.expenseId,
        p_description: input.description,
        p_amount: input.amount,
        p_paid_by: input.paid_by,
        p_split_type: input.split_type,
        p_spent_at: input.spent_at,
        p_notes: input.notes ?? null,
        p_splits: input.splits,
      });
      if (error) throw error;
      const expense = data as Expense;
      if (input.receipt_url) {
        const { error: patchError } = await supabase
          .from('expenses')
          .update({ receipt_url: input.receipt_url })
          .eq('id', args.expenseId);
        if (patchError) throw patchError;
      }
      return expense;
    },
    onSuccess: (_data, args) => {
      queryClient.invalidateQueries({ queryKey: qk.expenses(groupId) });
      queryClient.invalidateQueries({ queryKey: qk.expense(args.expenseId) });
      queryClient.invalidateQueries({ queryKey: qk.balances(groupId) });
      queryClient.invalidateQueries({ queryKey: qk.activity });
    },
  });
}

export function useDeleteExpense(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.expenses(groupId) });
      queryClient.invalidateQueries({ queryKey: qk.group(groupId) });
      queryClient.invalidateQueries({ queryKey: qk.balances(groupId) });
      queryClient.invalidateQueries({ queryKey: qk.activity });
    },
  });
}
