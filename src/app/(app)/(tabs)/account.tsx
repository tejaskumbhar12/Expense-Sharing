import { View } from 'react-native';

import { AppText, Avatar, Button, Card, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const email = user?.email ?? 'unknown';
  const name = (user?.user_metadata?.full_name as string | undefined) || email;

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.three }}>
        <Avatar name={name} size={52} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="heading">{name}</AppText>
          <AppText variant="caption">{email}</AppText>
        </View>
      </Card>

      {!isSupabaseConfigured ? (
        <Card>
          <AppText variant="caption" color="warning">
            Supabase not configured — set your keys in .env and restart with `npx expo start -c`.
          </AppText>
        </Card>
      ) : null}

      <Button title="Sign out" variant="secondary" onPress={() => signOut()} />
    </Screen>
  );
}
