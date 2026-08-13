import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Linking, Platform, Pressable, View } from 'react-native';

import { AppText, Card, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const LINKEDIN_URL = 'https://www.linkedin.com/in/tejas-kumbhar-a3594487';

export default function AboutScreen() {
  const router = useRouter();
  const c = useTheme();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        hitSlop={8}
        style={{ alignSelf: 'flex-start' }}
      >
        <AppText style={{ color: c.primary, fontSize: 16, fontWeight: '600' }}>‹ Back</AppText>
      </Pressable>

      <View style={{ alignItems: 'center', gap: 2, paddingVertical: Spacing.three }}>
        <AppText variant="title">SplitKaroo</AppText>
        <AppText variant="caption">Split expenses with friends — the easy way.</AppText>
        <AppText variant="caption">Version {version}</AppText>
      </View>

      <Card style={{ gap: Spacing.two }}>
        <AppText variant="heading">What it does</AppText>
        <AppText variant="body">
          Create groups, add friends, and split expenses equally, by exact amounts, by percentage,
          or by shares. See who owes whom, simplify debts to the fewest transfers, settle up, attach
          receipts, and share a PDF summary.
        </AppText>
      </Card>

      <Card style={{ gap: Spacing.two }}>
        <AppText variant="heading">Made by</AppText>
        <Pressable onPress={() => Linking.openURL(LINKEDIN_URL)} hitSlop={6}>
          <AppText variant="body" color="primary" style={{ fontWeight: '700' }}>
            Made by Tejas Kumbhar
          </AppText>
          <AppText variant="caption">Connect on LinkedIn ›</AppText>
        </Pressable>
      </Card>

      <Card style={{ gap: Spacing.two }}>
        <AppText variant="heading">Disclaimer</AppText>
        <AppText variant="caption">
          SplitKaroo is a personal, non-commercial hobby project provided “as is” and “as
          available”, without warranties of any kind. It is not affiliated with, endorsed by, or
          connected to Splitwise or any other company. Balances and suggested settlements are for
          convenience only, may contain errors, and are not financial advice — always verify amounts
          before sending or receiving money. To the maximum extent permitted by law, the author is
          not liable for any loss or corruption of data, service downtime, inaccuracies, or any
          damages arising from use of the app. You use it entirely at your own risk and are
          responsible for the information you enter and for keeping your own records.
        </AppText>
      </Card>

      {Platform.OS === 'web' ? (
        <AppText variant="caption" style={{ textAlign: 'center' }}>
          © {new Date().getFullYear()} Tejas Kumbhar
        </AppText>
      ) : null}
    </Screen>
  );
}
