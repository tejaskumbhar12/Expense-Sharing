import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Switch, View } from 'react-native';

import {
  AppText,
  Avatar,
  Button,
  Card,
  Divider,
  EmptyState,
  Screen,
  SegmentedControl,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useConfirm } from '@/components/ConfirmProvider';
import { useAuth } from '@/lib/auth';
import { useGroupBalances } from '@/lib/queries/balances';
import { useExpenses } from '@/lib/queries/expenses';
import { useDeleteGroup, useGroup, useUpdateGroupSettings } from '@/lib/queries/groups';
import { useGroupMembers, useLeaveGroup, useRemoveMember } from '@/lib/queries/members';
import { useGroupRealtime } from '@/lib/queries/realtime';
import { useDeleteSettlement, useSettlements, type SettlementView } from '@/lib/queries/settlements';
import { formatMoney } from '@/lib/format';
import { buildGroupHtml, exportGroupPdf } from '@/lib/pdf';
import { fromMinor, toMinor } from '@/lib/split';
import type { GroupMember } from '@/types/models';

type Tab = 'expenses' | 'balances' | 'members';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useTheme();
  const confirm = useConfirm();
  const { user } = useAuth();
  const group = useGroup(id);
  const members = useGroupMembers(id);
  const removeMember = useRemoveMember(id);
  const deleteGroup = useDeleteGroup();
  const leaveGroup = useLeaveGroup(id);
  const expenses = useExpenses(id);
  const balances = useGroupBalances(id);
  const settlements = useSettlements(id);
  const deleteSettlement = useDeleteSettlement(id);
  const updateSettings = useUpdateGroupSettings();
  useGroupRealtime(id);
  const currency = group.data?.currency ?? 'INR';

  const [tab, setTab] = useState<Tab>('expenses');

  const [simplify, setSimplify] = useState(true);
  useEffect(() => {
    if (group.data) setSimplify(group.data.simplify_debts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.data?.simplify_debts]);
  const onToggleSimplify = (v: boolean) => {
    setSimplify(v);
    updateSettings.mutate({ id, simplify_debts: v });
  };
  const suggested = balances.data
    ? simplify
      ? balances.data.transfers
      : balances.data.directTransfers
    : [];

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      group.refetch(),
      members.refetch(),
      expenses.refetch(),
      balances.refetch(),
      settlements.refetch(),
    ]);
    setRefreshing(false);
  };

  const isOwner = !!user && group.data?.created_by === user.id;
  const myMembership = members.data?.find((m) => m.user_id === user?.id);

  const [removeError, setRemoveError] = useState<string | null>(null);
  // null while balances are still loading (so Remove doesn't flash before we know).
  const balanceOf = (memberId: string): number | null =>
    balances.data
      ? balances.data.balances.find((b) => b.member.id === memberId)?.balanceMinor ?? 0
      : null;

  // A member can only leave once they're settled up (zero net balance).
  const myBalanceMinor =
    balances.data?.balances.find((b) => b.member.id === myMembership?.id)?.balanceMinor ?? 0;
  const canLeave = !!myMembership && !!balances.data && myBalanceMinor === 0;
  const leaveBlockedMsg = !balances.data
    ? 'Checking your balance…'
    : myBalanceMinor > 0
      ? `You're owed ${formatMoney(myBalanceMinor, currency)}. Settle up before leaving.`
      : myBalanceMinor < 0
        ? `You owe ${formatMoney(-myBalanceMinor, currency)}. Settle up before leaving.`
        : null;

  async function confirmRemove(m: GroupMember) {
    setRemoveError(null);
    if (await confirm('Remove member', `Remove ${m.display_name} from this group?`, {
      confirmLabel: 'Remove',
      destructive: true,
    })) {
      removeMember.mutate(m.id, {
        onError: (e) =>
          setRemoveError(
            `Couldn't remove ${m.display_name}: ${(e as Error).message}. They may have expenses in this group.`
          ),
      });
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

  async function confirmDeleteSettlement(s: SettlementView) {
    if (
      await confirm(
        'Delete payment',
        `Delete this ${formatMoney(toMinor(Number(s.amount)), currency)} payment?`,
        { confirmLabel: 'Delete', destructive: true }
      )
    ) {
      deleteSettlement.mutate(s.id);
    }
  }

  async function onExportPdf() {
    const html = buildGroupHtml({
      groupName: group.data?.name ?? 'Group',
      currency,
      balances: balances.data?.balances ?? [],
      transfers: suggested,
      simplified: simplify,
      expenses: expenses.data ?? [],
      settlements: settlements.data ?? [],
    });
    try {
      await exportGroupPdf(html);
    } catch (e) {
      console.warn('PDF export failed', e);
    }
  }

  return (
    <Screen
      scroll
      contentStyle={{ gap: Spacing.four }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />
      }
    >
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

          <SegmentedControl<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: 'expenses', label: 'Expenses' },
              { value: 'balances', label: 'Balances' },
              { value: 'members', label: 'Members' },
            ]}
          />

          {/* ---------- Expenses ---------- */}
          {tab === 'expenses' ? (
            <View style={{ gap: Spacing.two }}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <AppText variant="heading">Expenses</AppText>
                <Button
                  title="Add"
                  variant="ghost"
                  onPress={() => router.push(`/group/${id}/add-expense`)}
                />
              </View>

              {expenses.isLoading ? (
                <View style={{ padding: Spacing.four, alignItems: 'center' }}>
                  <ActivityIndicator color={c.primary} />
                </View>
              ) : (expenses.data?.length ?? 0) === 0 ? (
                <Card>
                  <AppText variant="caption">No expenses yet. Tap Add to record the first one.</AppText>
                </Card>
              ) : (
                <Card style={{ padding: 0, paddingHorizontal: Spacing.four }}>
                  {expenses.data!.map((exp, i) => (
                    <View key={exp.id}>
                      {i > 0 ? <Divider /> : null}
                      <Pressable
                        onPress={() => router.push(`/group/${id}/expense/${exp.id}`)}
                        style={({ pressed }) => ({
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: Spacing.three,
                          paddingVertical: Spacing.three,
                          opacity: pressed ? 0.6 : 1,
                        })}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <AppText variant="body" style={{ fontWeight: '600' }}>
                            {exp.description}
                          </AppText>
                          <AppText variant="caption">
                            {exp.payer?.display_name ?? 'someone'} paid · {exp.spent_at}
                          </AppText>
                        </View>
                        <AppText variant="body" style={{ fontWeight: '700' }}>
                          {formatMoney(toMinor(exp.amount), currency)}
                        </AppText>
                      </Pressable>
                    </View>
                  ))}
                </Card>
              )}
            </View>
          ) : null}

          {/* ---------- Balances ---------- */}
          {tab === 'balances' ? (
            <View style={{ gap: Spacing.four }}>
              <View style={{ gap: Spacing.two }}>
                <AppText variant="heading">Balances</AppText>
                {balances.isLoading ? (
                  <View style={{ padding: Spacing.four, alignItems: 'center' }}>
                    <ActivityIndicator color={c.primary} />
                  </View>
                ) : balances.error ? (
                  <Card>
                    <AppText variant="caption" color="danger">
                      {(balances.error as Error).message}
                    </AppText>
                  </Card>
                ) : (
                  <Card style={{ padding: 0, paddingHorizontal: Spacing.four }}>
                    {balances.data!.balances.map((b, i) => (
                      <View key={b.member.id}>
                        {i > 0 ? <Divider /> : null}
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: Spacing.three,
                            paddingVertical: Spacing.three,
                          }}
                        >
                          <Avatar name={b.member.display_name} size={36} />
                          <AppText variant="body" style={{ flex: 1, fontWeight: '600' }}>
                            {b.member.display_name}
                            {b.member.user_id === user?.id ? '  (you)' : ''}
                          </AppText>
                          {b.balanceMinor === 0 ? (
                            <AppText variant="caption">settled</AppText>
                          ) : (
                            <AppText
                              variant="body"
                              color={b.balanceMinor > 0 ? 'positive' : 'negative'}
                              style={{ fontWeight: '700' }}
                            >
                              {b.balanceMinor > 0 ? 'gets ' : 'owes '}
                              {formatMoney(Math.abs(b.balanceMinor), currency)}
                            </AppText>
                          )}
                        </View>
                      </View>
                    ))}
                  </Card>
                )}

                {balances.data ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="label">Simplify debts</AppText>
                      <AppText variant="caption">
                        {simplify
                          ? 'Fewest transactions (may route through others)'
                          : 'Direct debts between each pair'}
                      </AppText>
                    </View>
                    <Switch
                      value={simplify}
                      onValueChange={onToggleSimplify}
                      trackColor={{ true: c.primary, false: c.border }}
                    />
                  </View>
                ) : null}

                {balances.data && suggested.length > 0 ? (
                  <Card style={{ gap: Spacing.three }}>
                    <AppText variant="label">Suggested settlements</AppText>
                    {suggested.map((t, i) => (
                      <View
                        key={i}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.two }}
                      >
                        <AppText variant="body" style={{ flex: 1 }}>
                          {t.from.display_name} → {t.to.display_name}
                        </AppText>
                        <AppText variant="body" style={{ fontWeight: '700' }}>
                          {formatMoney(t.amountMinor, currency)}
                        </AppText>
                        <Button
                          title="Settle"
                          variant="ghost"
                          onPress={() =>
                            router.push(
                              `/group/${id}/settle?from=${t.from.id}&to=${t.to.id}&amount=${fromMinor(t.amountMinor)}`
                            )
                          }
                        />
                      </View>
                    ))}
                  </Card>
                ) : balances.data ? (
                  <Card>
                    <AppText variant="caption" color="success">
                      Everyone&apos;s settled up.
                    </AppText>
                  </Card>
                ) : null}

                <Button
                  title="Settle up"
                  variant="secondary"
                  onPress={() => router.push(`/group/${id}/settle`)}
                />
              </View>

              <View style={{ gap: Spacing.two }}>
                <AppText variant="heading">Payments</AppText>
                {settlements.isLoading ? (
                  <View style={{ padding: Spacing.four, alignItems: 'center' }}>
                    <ActivityIndicator color={c.primary} />
                  </View>
                ) : (settlements.data?.length ?? 0) === 0 ? (
                  <Card>
                    <AppText variant="caption">No payments recorded yet.</AppText>
                  </Card>
                ) : (
                  <Card style={{ padding: 0, paddingHorizontal: Spacing.four }}>
                    {settlements.data!.map((s, i) => (
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
                          <View style={{ flex: 1, gap: 2 }}>
                            <AppText variant="body" style={{ fontWeight: '600' }}>
                              {s.from?.display_name ?? '?'} → {s.to?.display_name ?? '?'}
                            </AppText>
                            <AppText variant="caption">
                              {s.settled_at}
                              {s.note ? ` · ${s.note}` : ''}
                            </AppText>
                          </View>
                          <AppText variant="body" style={{ fontWeight: '700' }}>
                            {formatMoney(toMinor(Number(s.amount)), currency)}
                          </AppText>
                          <Pressable hitSlop={8} onPress={() => confirmDeleteSettlement(s)}>
                            <AppText variant="label" color="danger">
                              Delete
                            </AppText>
                          </Pressable>
                        </View>
                      </View>
                    ))}
                  </Card>
                )}
              </View>

              <Button title="Share summary (PDF)" variant="secondary" onPress={onExportPdf} />
            </View>
          ) : null}

          {/* ---------- Members ---------- */}
          {tab === 'members' ? (
            <View style={{ gap: Spacing.four }}>
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
                      const bal = balanceOf(m.id);
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
                            ) : m.user_id === user?.id ? null : bal == null ? null : bal !== 0 ? (
                              <AppText variant="label" color="warning">
                                {bal > 0 ? 'gets ' : 'owes '}
                                {formatMoney(Math.abs(bal), currency)}
                              </AppText>
                            ) : (
                              <Pressable hitSlop={8} onPress={() => confirmRemove(m)}>
                                <AppText variant="label" color="danger">
                                  Remove
                                </AppText>
                              </Pressable>
                            )}
                          </View>
                        </View>
                      );
                    })
                  )}
                </Card>
                {removeError ? (
                  <AppText variant="caption" color="danger">
                    {removeError}
                  </AppText>
                ) : null}
                <AppText variant="caption">
                  Anyone can remove a member who is settled up (owes and is owed nothing).
                </AppText>
              </View>

              {isOwner ? (
                <Button
                  title="Delete group"
                  variant="danger"
                  onPress={confirmDelete}
                  loading={deleteGroup.isPending}
                />
              ) : myMembership ? (
                <View style={{ gap: Spacing.two }}>
                  <Button
                    title="Leave group"
                    variant="secondary"
                    onPress={confirmLeave}
                    loading={leaveGroup.isPending}
                    disabled={!canLeave}
                  />
                  {!canLeave && leaveBlockedMsg ? (
                    <AppText variant="caption" color="warning" style={{ textAlign: 'center' }}>
                      {leaveBlockedMsg}
                    </AppText>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
