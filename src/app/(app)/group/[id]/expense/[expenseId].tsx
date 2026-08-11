import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText, Avatar, Button, Card, Divider, EmptyState, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { confirm } from '@/lib/confirm';
import { useDeleteExpense, useExpense } from '@/lib/queries/expenses';
import { formatMoney } from '@/lib/format';
import { toMinor } from '@/lib/split';
import type { SplitType } from '@/types/models';

const SPLIT_LABEL: Record<SplitType, string> = {
  equal: 'Split equally',
  exact: 'Exact amounts',
  percent: 'By percentage',
  shares: 'By shares',
};

export default function ExpenseDetailScreen() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId: string }>();
  const router = useRouter();
  const c = useTheme();
  const expense = useExpense(expenseId);
  const del = useDeleteExpense(id);

  const e = expense.data;
  const currency = e?.currency ?? 'INR';

  async function onDelete() {
    if (await confirm('Delete expense', `Delete "${e?.description}"?`, { confirmLabel: 'Delete', destructive: true })) {
      del.mutate(expenseId, { onSuccess: () => router.back() });
    }
  }

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <Stack.Screen options={{ title: e?.description ?? 'Expense' }} />

      {!router.canGoBack() ? (
        <Pressable onPress={() => router.replace(`/group/${id}`)} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
          <AppText style={{ color: c.primary, fontSize: 16, fontWeight: '600' }}>‹ Back</AppText>
        </Pressable>
      ) : null}

      {expense.isLoading ? (
        <View style={{ paddingTop: Spacing.six, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : expense.error || !e ? (
        <EmptyState title="Couldn't load expense" subtitle={(expense.error as Error)?.message} />
      ) : (
        <>
          <View style={{ gap: 4 }}>
            <AppText variant="title">{formatMoney(toMinor(e.amount), currency)}</AppText>
            <AppText variant="body" style={{ fontWeight: '600' }}>
              {e.description}
            </AppText>
            <AppText variant="caption">
              Paid by {e.payer?.display_name ?? 'someone'} · {e.spent_at}
            </AppText>
            {e.notes ? <AppText variant="caption">{e.notes}</AppText> : null}
          </View>

          <View style={{ gap: Spacing.two }}>
            <AppText variant="heading">{SPLIT_LABEL[e.split_type]}</AppText>
            <Card style={{ padding: 0, paddingHorizontal: Spacing.four }}>
              {e.splits.map((s, i) => (
                <View key={s.id}>
                  {i > 0 ? <Divider /> : null}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: Spacing.three,
                      paddingVertical: Spacing.three,
                    }}
                  >
                    <Avatar name={s.member?.display_name ?? '?'} size={36} />
                    <AppText variant="body" style={{ flex: 1, fontWeight: '600' }}>
                      {s.member?.display_name ?? 'Member'}
                    </AppText>
                    <AppText variant="body">{formatMoney(toMinor(s.amount_owed), currency)}</AppText>
                  </View>
                </View>
              ))}
            </Card>
          </View>

          <View style={{ gap: Spacing.three }}>
            <Button
              title="Edit expense"
              variant="secondary"
              onPress={() => router.push(`/group/${id}/add-expense?expenseId=${expenseId}`)}
            />
            <Button title="Delete expense" variant="danger" onPress={onDelete} loading={del.isPending} />
          </View>
        </>
      )}
    </Screen>
  );
}
