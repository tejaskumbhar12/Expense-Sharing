import { Stack } from 'expo-router';

// Bottom tabs will replace this Stack in a later milestone (M2).
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
