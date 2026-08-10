import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';

import { AppText, Avatar, Button, Card, EmptyState, FAB, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useGroups } from '@/lib/queries/groups';

export default function GroupsScreen() {
  const router = useRouter();
  const c = useTheme();
  const { data: groups, isLoading, error, refetch, isRefetching } = useGroups();

  if (isLoading) {
    return (
      <Screen edges={['bottom']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState
          title="Couldn't load groups"
          subtitle={(error as Error).message}
          action={<Button title="Retry" variant="secondary" onPress={() => refetch()} />}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No groups yet"
            subtitle="Create a group for a trip, flat, or friends to start splitting expenses."
            action={<Button title="Create a group" onPress={() => router.push('/new-group')} />}
          />
        }
        renderItem={({ item }) => (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <Pressable
              onPress={() => router.push(`/group/${item.id}`)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.three,
                padding: Spacing.four,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Avatar name={item.name} size={44} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="body" style={{ fontWeight: '700' }}>
                  {item.name}
                </AppText>
                <AppText variant="caption">
                  {item.memberCount} {item.memberCount === 1 ? 'member' : 'members'} · {item.currency}
                </AppText>
              </View>
              <AppText variant="heading" color="textSecondary">
                ›
              </AppText>
            </Pressable>
          </Card>
        )}
      />
      <FAB label="New group" onPress={() => router.push('/new-group')} />
    </Screen>
  );
}
