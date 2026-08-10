import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText, Avatar, Button, Card, Divider, EmptyState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { confirm } from '@/lib/confirm';
import { useDeleteGroup, useGroup } from '@/lib/queries/groups';
import { useGroupMembers, useLeaveGroup, useRemoveMember } from '@/lib/queries/members';
import type { GroupMember } from '@/types/models';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useTheme();
  const { user } = useAuth();
  const group = useGroup(id);
  const members = useGroupMembers(id);
  const removeMember = useRemoveMember(id);
  const deleteGroup = useDeleteGroup();
  const leaveGroup = useLeaveGroup(id);

  const isOwner = !!user && group.data?.created_by === user.id;
  const myMembership = members.data?.find((m) => m.user_id === user?.id);

  async function confirmRemove(m: GroupMember) {
    if (await confirm('Remove member', `Remove ${m.display_name} from this group?`, {
      confirmLabel: 'Remove',
      destructive: true,
    })) {
      removeMember.mutate(m.id);
    }
  }

  async function confirmDelete() {
    if (await confirm('Delete group', `Delete "${group.data?.name}"? This can't be undone.`, {
      confirmLabel: 'Delete',
      destructive: true,
    })) {
      deleteGroup.mutate(id, { onSuccess: () => router.back() });
    }
  }

  async function confirmLeave() {
    if (!user) return;
    if (await confirm('Leave group', `Leave "${group.data?.name}"?`, {
      confirmLabel: 'Leave',
      destructive: true,
    })) {
      leaveGroup.mutate(user.id, { onSuccess: () => router.back() });
    }
  }

  function memberSubtitle(m: GroupMember): string {
    if (!m.user_id) return m.email || m.phone || 'Invited (not yet joined)';
    return m.email || m.phone || 'Member';
  }

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <Stack.Screen options={{ title: group.data?.name ?? 'Group' }} />

      {/* Native header shows a back button only when there's navigation history;
          on a direct load / reload there's none, so fall back to an inline link. */}
      {!router.canGoBack() ? (
        <Pressable onPress={() => router.replace('/')} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
          <AppText style={{ color: c.primary, fontSize: 16, fontWeight: '600' }}>‹ Back</AppText>
        </Pressable>
      ) : null}

      {group.isLoading ? (
        <View style={{ paddingTop: Spacing.six, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : group.error ? (
        <EmptyState title="Couldn't load group" subtitle={(group.error as Error).message} />
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
            <Avatar name={group.data?.name ?? '?'} size={52} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="title">{group.data?.name}</AppText>
              <AppText variant="caption">
                {members.data?.length ?? 0} members · {group.data?.currency}
              </AppText>
            </View>
          </View>

          <View style={{ gap: Spacing.two }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <AppText variant="heading">Members</AppText>
              <Button
                title="Add"
                variant="ghost"
                onPress={() => router.push(`/group/${id}/add-member`)}
              />
            </View>

            <Card style={{ padding: 0, paddingHorizontal: Spacing.four }}>
              {members.isLoading ? (
                <View style={{ padding: Spacing.four, alignItems: 'center' }}>
                  <ActivityIndicator color={c.primary} />
                </View>
              ) : (
                (members.data ?? []).map((m, i) => {
                  const canRemove = isOwner && m.role !== 'owner';
                  return (
                    <View key={m.id}>
                      {i > 0 ? <Divider /> : null}
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: Spacing.three,
                          paddingVertical: Spacing.three,
                        }}
                      >
                        <Avatar name={m.display_name} size={40} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <AppText variant="body" style={{ fontWeight: '600' }}>
                            {m.display_name}
                            {m.user_id === user?.id ? '  (you)' : ''}
                          </AppText>
                          <AppText variant="caption">{memberSubtitle(m)}</AppText>
                        </View>
                        {m.role === 'owner' ? (
                          <AppText variant="label" color="primary">
                            Owner
                          </AppText>
                        ) : canRemove ? (
                          <Pressable hitSlop={8} onPress={() => confirmRemove(m)}>
                            <AppText variant="label" color="danger">
                              Remove
                            </AppText>
                          </Pressable>
                        ) : !m.user_id ? (
                          <AppText variant="label" color="warning">
                            Invited
                          </AppText>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </Card>
          </View>

          <View style={{ gap: Spacing.two }}>
            <AppText variant="heading">Expenses</AppText>
            <Card>
              <AppText variant="caption">
                Adding and splitting expenses arrives next (M3), followed by balances and settle-up
                (M4).
              </AppText>
            </Card>
          </View>

          <View style={{ marginTop: Spacing.two }}>
            {isOwner ? (
              <Button
                title="Delete group"
                variant="danger"
                onPress={confirmDelete}
                loading={deleteGroup.isPending}
              />
            ) : myMembership ? (
              <Button
                title="Leave group"
                variant="secondary"
                onPress={confirmLeave}
                loading={leaveGroup.isPending}
              />
            ) : null}
          </View>
        </>
      )}
    </Screen>
  );
}
