/**
 * Lightweight UI primitives built on plain React Native + the app theme.
 * Avoids an external UI dependency (keeps things robust on the current
 * bleeding-edge Expo/React version).
 */
import { forwardRef, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  PressableProps,
  ScrollView,
  ScrollViewProps,
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
type Edge = 'top' | 'right' | 'bottom' | 'left';

export function Screen({
  children,
  scroll = false,
  contentStyle,
  edges,
  refreshControl,
  ...rest
}: ViewProps & {
  scroll?: boolean;
  contentStyle?: ViewProps['style'];
  edges?: Edge[];
  refreshControl?: ScrollViewProps['refreshControl'];
}) {
  const c = useTheme();
  return (
    <SafeAreaView edges={edges} style={[{ flex: 1, backgroundColor: c.background }]} {...rest}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[{ padding: Spacing.four }, contentStyle]}
          refreshControl={refreshControl}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
      )}
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

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const c = useTheme();
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.backgroundSelected,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: c.text, fontWeight: '700', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export function Row({
  onPress,
  left,
  title,
  subtitle,
  right,
}: {
  onPress?: () => void;
  left?: ReactNode;
  title: string;
  subtitle?: string | null;
  right?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed && onPress ? 0.6 : 1 }]}
    >
      {left}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" style={{ fontWeight: '600' }}>
          {title}
        </AppText>
        {subtitle ? <AppText variant="caption">{subtitle}</AppText> : null}
      </View>
      {right}
    </Pressable>
  );
}

export function FAB({
  onPress,
  label,
  style,
}: {
  onPress: () => void;
  label?: string;
  style?: ViewProps['style'];
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.fab, { backgroundColor: c.primary, opacity: pressed ? 0.9 : 1 }, style as object]}
    >
      <Text style={{ color: c.primaryText, fontSize: 22, fontWeight: '700', lineHeight: 24 }}>+</Text>
      {label ? <Text style={{ color: c.primaryText, fontWeight: '700', fontSize: 15 }}>{label}</Text> : null}
    </Pressable>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const c = useTheme();
  return (
    <View style={[styles.segment, { backgroundColor: c.backgroundElement }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={[styles.segmentItem, active && { backgroundColor: c.card }]}
          >
            <Text style={{ color: active ? c.text : c.textSecondary, fontWeight: '600', fontSize: 13 }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function EmptyState({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', padding: 48, gap: 8 }}>
      <AppText variant="heading">{title}</AppText>
      {subtitle ? (
        <AppText variant="caption" style={{ textAlign: 'center' }}>
          {subtitle}
        </AppText>
      ) : null}
      {action ? <View style={{ marginTop: 12 }}>{action}</View> : null}
    </View>
  );
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 52,
    paddingHorizontal: Spacing.four,
    borderRadius: 26,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
