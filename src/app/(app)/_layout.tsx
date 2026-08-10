import { Stack, useRouter } from 'expo-router';
import { Platform, Pressable, Text } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export default function AppLayout() {
  const c = useTheme();
  const router = useRouter();

  // Native modals dismiss via swipe/back; web needs an explicit close control.
  const webClose =
    Platform.OS === 'web'
      ? () => (
          <Pressable onPress={() => router.back()} hitSlop={10} style={{ paddingHorizontal: 8 }}>
            <Text style={{ color: c.primary, fontSize: 16, fontWeight: '600' }}>Close</Text>
          </Pressable>
        )
      : undefined;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.background },
        headerTintColor: c.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: c.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="new-group"
        options={{ presentation: 'modal', title: 'New group', headerLeft: webClose }}
      />
      <Stack.Screen name="group/[id]/index" options={{ title: '' }} />
      <Stack.Screen
        name="group/[id]/add-member"
        options={{ presentation: 'modal', title: 'Add member', headerLeft: webClose }}
      />
    </Stack>
  );
}
