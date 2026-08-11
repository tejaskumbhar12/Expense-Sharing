/** Centralised React Query keys so invalidation stays consistent. */
export const qk = {
  groups: ['groups'] as const,
  group: (id: string) => ['groups', id] as const,
  members: (groupId: string) => ['groups', groupId, 'members'] as const,
  expenses: (groupId: string) => ['groups', groupId, 'expenses'] as const,
  expense: (expenseId: string) => ['expenses', expenseId] as const,
  balances: (groupId: string) => ['groups', groupId, 'balances'] as const,
  settlements: (groupId: string) => ['groups', groupId, 'settlements'] as const,
};
