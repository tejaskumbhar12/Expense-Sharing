import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from 'react-native';

import { AppText, Avatar, Button, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { useGroup } from '@/lib/queries/groups';
import { useGroupMembers } from '@/lib/queries/members';
import { useCreateSettlement } from '@/lib/queries/settlements';
import type { GroupMember } from '@/types/models';

const num = (s: string) => {
  const n = parseFloat(s.trim());
  return Number.isFinite(n) ? n : 0;
};
const today = () => new Date().toISOString().slice(0, 10);

export default function SettleScreen() {
  const { id, from, to, amount } = useLocalSearchParams<{
    id: string;
    from?: string;
    to?: string;
    amount?: string;
  }>();
  const router = useRouter();
  const c = useTheme();
  const { user } = useAuth();

  const group = useGroup(id);
  const members = useGroupMembers(id);
  const createSettlement = useCreateSettlement(id);
  const currency = group.data?.currency ?? 'INR';

  const [fromMember, setFromMember] = useState<string | null>(from ?? null);
  const [toMember, setToMember] = useState<string | null>(to ?? null);
  const [amt, setAmt] = useState(amount ?? '');
  const [settledAt, setSettledAt] = useState(today());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Default the payer to the current user's membership once members load.
  useEffect(() => {
    if (fromMember || !members.data) return;
    const mine = members.data.find((m) => m.user_id === user?.id);
    setFromMember(mine?.id ?? members.data[0]?.id ?? null);
  }, [members.data, user?.id, fromMember]);

  async function onSubmit() {
    setError(null);
    if (!fromMember || !toMember) return setError('Pick who paid and who received.');
    if (fromMember === toMember) return setError('Payer and receiver must differ.');
    if (num(amt) <= 0) return setError('Enter an amount greater than 0.');

    setBusy(true);
    try {
      await createSettlement.mutateAsync({
        from_member: fromMember,
        to_member: toMember,
        amount: num(amt),
        settled_at: settledAt,
        note: note.trim() || null,
      });
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const MemberChips = ({
    value,
    onChange,
  }: {
    value: string | null;
    onChange: (id: string) => void;
  }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', gap: Spacing.two }}>
        {(members.data ?? []).map((m: GroupMember) => {
          const active = m.id === value;
          return (
            <Pressable
              key={m.id}
              onPress={() => onChange(m.id)}
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
              <AppText variant="label" style={{ color: active ? c.primaryText : c.text }}>
                {m.display_name}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <Stack.Screen options={{ title: 'Settle up' }} />

      {!members.data ? (
        <View style={{ paddingTop: Spacing.six, alignItems: 'center' }}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <>
          <View style={{ gap: Spacing.two }}>
            <AppText variant="label">Who paid</AppText>
            <MemberChips value={fromMember} onChange={setFromMember} />
          </View>

          <View style={{ gap: Spacing.two }}>
            <AppText variant="label">Who received</AppText>
            <MemberChips value={toMember} onChange={setToMember} />
          </View>

          <TextField
            label={`Amount (${currency})`}
            value={amt}
            onChangeText={setAmt}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          <TextField label="Date" value={settledAt} onChangeText={setSettledAt} placeholder="YYYY-MM-DD" />
          <TextField label="Note (optional)" value={note} onChangeText={setNote} placeholder="e.g. UPI" />

          {error ? (
            <AppText variant="caption" color="danger">
              {error}
            </AppText>
          ) : null}

          <Button title="Record payment" onPress={onSubmit} loading={busy} />
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
