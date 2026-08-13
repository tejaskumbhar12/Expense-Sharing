import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function AppLayout() {
  const c = useTheme();
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
      <Stack.Screen name="about" options={{ title: 'About' }} />
      <Stack.Screen name="new-group" options={{ presentation: 'modal', title: 'New group' }} />
      <Stack.Screen name="group/[id]/index" options={{ title: '' }} />
      <Stack.Screen name="group/[id]/add-member" options={{ presentation: 'modal', title: 'Add member' }} />
      <Stack.Screen name="group/[id]/add-expense" options={{ presentation: 'modal', title: 'Add expense' }} />
      <Stack.Screen name="group/[id]/settle" options={{ presentation: 'modal', title: 'Settle up' }} />
      <Stack.Screen name="group/[id]/expense/[expenseId]" options={{ title: '' }} />
    </Stack>
  );
}
