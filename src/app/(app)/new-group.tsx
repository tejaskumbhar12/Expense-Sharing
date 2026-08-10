import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { AppText, Button, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useCreateGroup } from '@/lib/queries/groups';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD'];

export default function NewGroupScreen() {
  const router = useRouter();
  const c = useTheme();
  const create = useCreateGroup();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [error, setError] = useState<string | null>(null);

  async function onCreate() {
    setError(null);
    if (!name.trim()) return setError('Enter a group name.');
    try {
      const group = await create.mutateAsync({ name: name.trim(), currency });
      router.back();
      router.push(`/group/${group.id}`);
    } catch (e) {
      setError((e as Error).message ?? 'Failed to create group.');
    }
  }

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <TextField
        label="Group name"
        value={name}
        onChangeText={setName}
        placeholder="Goa Trip, Flat 3B, ..."
        autoFocus
      />

      <View style={{ gap: Spacing.two }}>
        <AppText variant="label">Currency</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two }}>
          {CURRENCIES.map((code) => {
            const active = code === currency;
            return (
              <Pressable
                key={code}
                onPress={() => setCurrency(code)}
                style={{
                  paddingVertical: Spacing.two,
                  paddingHorizontal: Spacing.three,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? c.primary : c.border,
                  backgroundColor: active ? c.primary : 'transparent',
                }}
              >
                <AppText
                  variant="label"
                  style={{ color: active ? c.primaryText : c.textSecondary }}
                >
                  {code}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {error ? (
        <AppText variant="caption" color="danger">
          {error}
        </AppText>
      ) : null}

      <Button title="Create group" onPress={onCreate} loading={create.isPending} />
      {Platform.OS === 'web' ? (
        <Button
          title="Cancel"
          variant="ghost"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      ) : null}
    </Screen>
  );
}
