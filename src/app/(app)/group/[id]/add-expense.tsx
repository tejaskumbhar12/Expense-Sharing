import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from 'react-native';

import { SplitEditor, toSplitInputs, type SplitResult } from '@/components/SplitEditor';
import { AppText, Avatar, Button, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  useCreateExpense,
  useExpense,
  useUpdateExpense,
  type ExpenseFormInput,
} from '@/lib/queries/expenses';
import { useGroup } from '@/lib/queries/groups';
import { useGroupMembers } from '@/lib/queries/members';
import { fromMinor, toMinor } from '@/lib/split';

const num = (s: string) => {
  const n = parseFloat(s.trim());
  return Number.isFinite(n) ? n : 0;
};
const today = () => new Date().toISOString().slice(0, 10);

export default function AddExpenseScreen() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId?: string }>();
  const isEdit = !!expenseId;
  const router = useRouter();
  const c = useTheme();
  const { user } = useAuth();

  const group = useGroup(id);
  const members = useGroupMembers(id);
  const existing = useExpense(expenseId ?? '');
  const create = useCreateExpense(id);
  const update = useUpdateExpense(id);

  const currency = group.data?.currency ?? 'INR';

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payer, setPayer] = useState<string | null>(null);
  const [spentAt, setSpentAt] = useState(today());
  const [notes, setNotes] = useState('');
  const [split, setSplit] = useState<SplitResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Default the payer to the current user's membership once members load.
  useEffect(() => {
    if (payer || !members.data) return;
    const mine = members.data.find((m) => m.user_id === user?.id);
    setPayer(mine?.id ?? members.data[0]?.id ?? null);
  }, [members.data, user?.id, payer]);

  // Prefill basic fields when editing.
  useEffect(() => {
    if (!isEdit || !existing.data) return;
    const e = existing.data;
    setDescription(e.description);
    setAmount(String(e.amount));
    setPayer(e.paid_by);
    setSpentAt(e.spent_at);
    setNotes(e.notes ?? '');
  }, [isEdit, existing.data]);

  const totalMinor = toMinor(num(amount));
  const ready = !!members.data && (!isEdit || !!existing.data);

  // Rebuild the SplitEditor's initial state (type, participants, per-person inputs)
  // from the existing expense when editing.
  const editInitial = useMemo(() => {
    if (!isEdit || !existing.data) return undefined;
    const e = existing.data;
    const exactMap: Record<string, string> = {};
    const percentMap: Record<string, string> = {};
    const sharesMap: Record<string, string> = {};
    for (const s of e.splits) {
      if (e.split_type === 'exact') exactMap[s.member_id] = String(s.amount_owed);
      else if (e.split_type === 'percent') percentMap[s.member_id] = s.share != null ? String(s.share) : '';
      else if (e.split_type === 'shares') sharesMap[s.member_id] = s.share != null ? String(s.share) : '';
    }
    return {
      splitType: e.split_type,
      included: e.splits.map((s) => s.member_id),
      exact: exactMap,
      percent: percentMap,
      shares: sharesMap,
    };
  }, [isEdit, existing.data]);

  async function onSubmit() {
    setError(null);
    if (!description.trim()) return setError('Enter a description.');
    if (totalMinor <= 0) return setError('Enter an amount greater than 0.');
    if (!payer) return setError('Choose who paid.');
    if (!split || !split.valid) return setError(split?.error ?? 'Adjust the split so it balances.');

    setBusy(true);
    try {
      const input: ExpenseFormInput = {
        description: description.trim(),
        amount: fromMinor(totalMinor),
        currency,
        paid_by: payer,
        split_type: split.splitType,
        spent_at: spentAt,
        notes: notes.trim() || null,
        splits: toSplitInputs(split),
      };
      if (isEdit && expenseId) await update.mutateAsync({ expenseId, input });
      else await create.mutateAsync(input);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <Stack.Screen options={{ title: isEdit ? 'Edit expense' : 'Add expense' }} />

      {!ready ? (
        <View style={{ paddingTop: Spacing.six, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <>
          <TextField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Dinner, cab, groceries..."
          />
          <TextField
            label={`Amount (${currency})`}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />

          <View style={{ gap: Spacing.two }}>
            <AppText variant="label">Paid by</AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: Spacing.two }}>
                {members.data!.map((m) => {
                  const active = m.id === payer;
                  return (
                    <Pressable
                      key={m.id}
                      onPress={() => setPayer(m.id)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: Spacing.two,
                        paddingVertical: Spacing.two,
                        paddingHorizontal: Spacing.three,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? c.primary : c.border,
                        backgroundColor: active ? c.primary : 'transparent',
                      }}
                    >
                      <Avatar name={m.display_name} size={22} />
                      <AppText
                        variant="label"
                        style={{ color: active ? c.primaryText : c.text }}
                      >
                        {m.display_name}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          <TextField label="Date" value={spentAt} onChangeText={setSpentAt} placeholder="YYYY-MM-DD" />
          <TextField
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Anything to remember"
          />

          <View style={{ gap: Spacing.two }}>
            <AppText variant="heading">Split</AppText>
            <SplitEditor
              members={members.data!}
              totalMinor={totalMinor}
              currency={currency}
              initial={editInitial}
              onChange={setSplit}
            />
          </View>

          {error ? (
            <AppText variant="caption" color="danger">
              {error}
            </AppText>
          ) : null}

          <Button
            title={isEdit ? 'Save changes' : 'Add expense'}
            onPress={onSubmit}
            loading={busy}
          />
          {Platform.OS === 'web' ? (
            <Button
              title="Cancel"
              variant="ghost"
              onPress={() => (router.canGoBack() ? router.back() : router.replace(`/group/${id}`))}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}
