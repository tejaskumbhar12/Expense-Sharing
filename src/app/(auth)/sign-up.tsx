import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View } from 'react-native';

import { AppText, Button, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    if (!EMAIL_RE.test(email.trim())) return setError('Enter a valid email address.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setLoading(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() || null } },
    });
    setLoading(false);

    if (signUpError) return setError(signUpError.message);

    // If the project requires email confirmation, there's no session yet.
    if (!data.session) {
      Alert.alert(
        'Confirm your email',
        'We sent you a confirmation link. Verify your email, then sign in.',
        [{ text: 'OK', onPress: () => router.replace('/sign-in') }]
      );
    }
    // Otherwise the auth listener + root gate navigate into the app.
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'center', padding: Spacing.four, gap: Spacing.four }}
      >
        <View style={{ gap: Spacing.two }}>
          <AppText variant="title">Create account</AppText>
          <AppText variant="caption">Split expenses with friends, roommates, and trips.</AppText>
        </View>

        <View style={{ gap: Spacing.three }}>
          <TextField
            label="Name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            placeholder="Your name"
          />
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
            autoComplete="new-password"
            placeholder="At least 6 characters"
          />
          <TextField
            label="Confirm password"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry
            placeholder="Re-enter password"
            onSubmitEditing={onSubmit}
          />
          {error ? (
            <AppText variant="caption" color="danger">
              {error}
            </AppText>
          ) : null}
        </View>

        <View style={{ gap: Spacing.three }}>
          <Button title="Create account" onPress={onSubmit} loading={loading} />
          <Button
            title="Already have an account? Sign in"
            variant="ghost"
            onPress={() => router.replace('/sign-in')}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
