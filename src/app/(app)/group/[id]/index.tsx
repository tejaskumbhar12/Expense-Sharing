import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, View } from 'react-native';

import { AppText, Avatar, Button, Card, Divider, EmptyState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useGroup } from '@/lib/queries/groups';
import { useGroupMembers, useRemoveMember } from '@/lib/queries/members';
import type { GroupMember } from '@/types/models';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useTheme();
  const group = useGroup(id);
  const members = useGroupMembers(id);
  const removeMember = useRemoveMember(id);

  function confirmRemove(m: GroupMember) {
    if (m.role === 'owner') return;
    Alert.alert('Remove member', `Remove ${m.display_name} from this group?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeMember.mutate(m.id),
      },
    ]);
  }

  function memberSubtitle(m: GroupMember): string {
    if (!m.user_id) return m.email || m.phone || 'Invited (not yet joined)';
    return m.email || m.phone || 'Member';
  }

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <Stack.Screen options={{ title: group.data?.name ?? 'Group' }} />

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
                (members.data ?? []).map((m, i) => (
                  <View key={m.id}>
                    {i > 0 ? <Divider /> : null}
                    <Pressable
                      onLongPress={() => confirmRemove(m)}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: Spacing.three,
                        paddingVertical: Spacing.three,
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <Avatar name={m.display_name} size={40} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <AppText variant="body" style={{ fontWeight: '600' }}>
                          {m.display_name}
                        </AppText>
                        <AppText variant="caption">{memberSubtitle(m)}</AppText>
                      </View>
                      {m.role === 'owner' ? (
                        <AppText variant="label" color="primary">
                          Owner
                        </AppText>
                      ) : !m.user_id ? (
                        <AppText variant="label" color="warning">
                          Invited
                        </AppText>
                      ) : null}
                    </Pressable>
                  </View>
                ))
              )}
            </Card>
            <AppText variant="caption">Long-press a member to remove them.</AppText>
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
        </>
      )}
    </Screen>
  );
}
