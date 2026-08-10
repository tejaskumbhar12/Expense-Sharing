import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog returning a promise<boolean>.
 * React Native's Alert is a no-op on web, so fall back to window.confirm there.
 */
export function confirm(
  title: string,
  message?: string,
  options?: { confirmLabel?: string; cancelLabel?: string; destructive?: boolean }
): Promise<boolean> {
  const confirmLabel = options?.confirmLabel ?? 'OK';
  const cancelLabel = options?.cancelLabel ?? 'Cancel';

  if (Platform.OS === 'web') {
    const g = globalThis as { confirm?: (msg?: string) => boolean };
    const text = [title, message].filter(Boolean).join('\n\n');
    return Promise.resolve(typeof g.confirm === 'function' ? g.confirm(text) : true);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: options?.destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
