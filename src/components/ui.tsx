/**
 * Lightweight UI primitives built on plain React Native + the app theme.
 * Avoids an external UI dependency (keeps things robust on the current
 * bleeding-edge Expo/React version).
 */
import { forwardRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  View,
  ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ThemeColors = ReturnType<typeof useTheme>;

/** Full-screen container with safe-area padding and themed background. */
export function Screen({
  children,
  scroll = false,
  contentStyle,
  ...rest
}: ViewProps & { scroll?: boolean; contentStyle?: ViewProps['style'] }) {
  const c = useTheme();
  const Inner = scroll ? ScrollView : View;
  return (
    <SafeAreaView style={[{ flex: 1, backgroundColor: c.background }]} {...rest}>
      <Inner
        style={scroll ? undefined : [{ flex: 1 }, contentStyle]}
        contentContainerStyle={scroll ? [{ padding: Spacing.four }, contentStyle] : undefined}
      >
        {children}
      </Inner>
    </SafeAreaView>
  );
}

type TextVariant = 'title' | 'heading' | 'body' | 'label' | 'caption';

export function AppText({
  variant = 'body',
  color,
  style,
  ...rest
}: TextProps & { variant?: TextVariant; color?: keyof ThemeColors }) {
  const c = useTheme();
  const resolved = color ? c[color] : variant === 'caption' || variant === 'label' ? c.textSecondary : c.text;
  return <Text style={[styles.textBase, textVariants[variant], { color: resolved }, style]} {...rest} />;
}

const textVariants = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  heading: { fontSize: 20, fontWeight: '700' },
  body: { fontSize: 16, fontWeight: '400' },
  label: { fontSize: 13, fontWeight: '600' },
  caption: { fontSize: 13, fontWeight: '400' },
});

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  ...rest
}: PressableProps & { title: string; variant?: ButtonVariant; loading?: boolean }) {
  const c = useTheme();
  const bg = {
    primary: c.primary,
    secondary: c.backgroundElement,
    danger: c.danger,
    ghost: 'transparent',
  }[variant];
  const fg = {
    primary: c.primaryText,
    secondary: c.text,
    danger: '#ffffff',
    ghost: c.primary,
  }[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={(state) => [
        styles.button,
        { backgroundColor: bg, opacity: isDisabled ? 0.5 : state.pressed ? 0.85 : 1 },
        variant === 'ghost' && { paddingVertical: Spacing.two },
        style as object,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export const TextField = forwardRef<TextInput, TextInputProps & { label?: string; error?: string }>(
  function TextField({ label, error, style, ...rest }, ref) {
    const c = useTheme();
    return (
      <View style={{ gap: Spacing.two }}>
        {label ? <AppText variant="label">{label}</AppText> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={c.textSecondary}
          style={[
            styles.input,
            { backgroundColor: c.inputBg, borderColor: error ? c.danger : c.border, color: c.text },
            style,
          ]}
          {...rest}
        />
        {error ? (
          <AppText variant="caption" color="danger">
            {error}
          </AppText>
        ) : null}
      </View>
    );
  }
);

export function Card({ style, children, ...rest }: ViewProps) {
  const c = useTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

export function Divider() {
  const c = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }} />;
}

const styles = StyleSheet.create({
  textBase: { fontSize: 16 },
  button: {
    minHeight: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
  input: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.four,
  },
});
