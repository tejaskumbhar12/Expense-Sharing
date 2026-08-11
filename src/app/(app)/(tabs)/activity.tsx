import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';

import { AppText, Button, Card, EmptyState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useActivity } from '@/lib/queries/activity';
import { formatMoney } from '@/lib/format';

export default function ActivityScreen() {
  const router = useRouter();
  const c = useTheme();
  const { data, isLoading, error, refetch, isRefetching } = useActivity();

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
          title="Couldn't load activity"
          subtitle={(error as Error).message}
          action={<Button title="Retry" variant="secondary" onPress={() => refetch()} />}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['bottom']}>
      <FlatList
        data={data}
        keyExtractor={(it) => `${it.kind}-${it.id}`}
        contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={c.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            title="No activity yet"
            subtitle="Add an expense or record a payment and it shows up here."
          />
        }
        renderItem={({ item }) => (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <Pressable
              onPress={() =>
                item.kind === 'expense'
                  ? router.push(`/group/${item.groupId}/expense/${item.id}`)
                  : router.push(`/group/${item.groupId}`)
              }
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.three,
                padding: Spacing.four,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: c.backgroundElement,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText style={{ fontSize: 18 }}>{item.kind === 'expense' ? '🧾' : '💸'}</AppText>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="body" style={{ fontWeight: '600' }}>
                  {item.title}
                </AppText>
                <AppText variant="caption">{item.subtitle}</AppText>
              </View>
              <AppText variant="body" style={{ fontWeight: '700' }}>
                {formatMoney(item.amountMinor, item.currency)}
              </AppText>
            </Pressable>
          </Card>
        )}
      />
    </Screen>
  );
}
