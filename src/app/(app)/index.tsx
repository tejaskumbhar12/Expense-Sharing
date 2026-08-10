import { View } from 'react-native';

import { AppText, Button, Card, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <View style={{ gap: Spacing.two }}>
        <AppText variant="title">Expense Sharing</AppText>
        <AppText variant="caption">Signed in as {user?.email ?? 'unknown'}</AppText>
      </View>

      {!isSupabaseConfigured ? (
        <Card style={{ gap: Spacing.two }}>
          <AppText variant="label" color="warning">
            Supabase not configured
          </AppText>
          <AppText variant="caption">
            Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env, then restart
            with `npx expo start -c`.
          </AppText>
        </Card>
      ) : null}

      <Card style={{ gap: Spacing.two }}>
        <AppText variant="heading">Groups</AppText>
        <AppText variant="caption">
          Creating groups, adding members, and splitting expenses arrive in the next milestone (M2).
        </AppText>
      </Card>

      <Button title="Sign out" variant="secondary" onPress={() => signOut()} />
    </Screen>
  );
}
