import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ConfirmOptions {
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmFn = (title: string, message?: string, options?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

interface State {
  visible: boolean;
  title: string;
  message?: string;
  options: ConfirmOptions;
}

/**
 * In-app confirmation dialog. Replaces window.confirm / RN Alert, which are
 * unreliable on mobile web (iOS Safari suppresses them), with a themed Modal
 * that behaves the same on every platform.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const c = useTheme();
  const [state, setState] = useState<State>({ visible: false, title: '', options: {} });
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((title, message, options = {}) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setState({ visible: true, title, message, options });
    });
  }, []);

  const close = (result: boolean) => {
    setState((s) => ({ ...s, visible: false }));
    resolver.current?.(result);
    resolver.current = null;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        transparent
        visible={state.visible}
        animationType="fade"
        onRequestClose={() => close(false)}
      >
        <Pressable
          onPress={() => close(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: Spacing.four,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: '100%',
              maxWidth: 380,
              backgroundColor: c.card,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: c.border,
              padding: Spacing.four,
              gap: Spacing.three,
            }}
          >
            <AppText variant="heading">{state.title}</AppText>
            {state.message ? <AppText variant="body">{state.message}</AppText> : null}
            <View style={{ flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.two }}>
              <Button
                title={state.options.cancelLabel ?? 'Cancel'}
                variant="secondary"
                onPress={() => close(false)}
                style={{ flex: 1 }}
              />
              <Button
                title={state.options.confirmLabel ?? 'OK'}
                variant={state.options.destructive ? 'danger' : 'primary'}
                onPress={() => close(true)}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
