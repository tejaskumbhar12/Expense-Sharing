/** Centralised React Query keys so invalidation stays consistent. */
export const qk = {
  groups: ['groups'] as const,
  group: (id: string) => ['groups', id] as const,
  members: (groupId: string) => ['groups', groupId, 'members'] as const,
};
