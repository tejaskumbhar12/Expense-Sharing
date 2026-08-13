import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { AppText, Button, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (signInError) setError(signInError.message);
    // On success, the auth listener + root gate navigate to the app.
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.four }}
      >
        <View style={{ gap: Spacing.two }}>
          <AppText variant="title">Welcome back</AppText>
          <AppText variant="caption">Sign in to keep your groups in sync.</AppText>
        </View>

        <View style={{ gap: Spacing.three }}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            placeholder="••••••••"
            onSubmitEditing={onSubmit}
          />
          {error ? (
            <AppText variant="caption" color="danger">
              {error}
            </AppText>
          ) : null}
        </View>

        <View style={{ gap: Spacing.three }}>
          <Button title="Sign in" onPress={onSubmit} loading={loading} />
          <Button
            title="New here? Create an account"
            variant="ghost"
            onPress={() => router.push('/sign-up')}
          />
          <Button title="About SplitKaroo" variant="ghost" onPress={() => router.push('/about')} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
