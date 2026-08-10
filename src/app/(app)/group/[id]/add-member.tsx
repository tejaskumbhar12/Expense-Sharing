import * as Contacts from 'expo-contacts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { AppText, Button, Screen, SegmentedControl, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { findUserByEmail, useAddMember } from '@/lib/queries/members';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Mode = 'email' | 'manual';

export default function AddMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const add = useAddMember(id);

  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addByEmail() {
    setError(null);
    const e = email.trim();
    if (!EMAIL_RE.test(e)) return setError('Enter a valid email address.');
    setBusy(true);
    try {
      const found = await findUserByEmail(e);
      await add.mutateAsync({
        display_name: found?.full_name || e.split('@')[0],
        email: found?.email ?? e,
        user_id: found?.id ?? null,
      });
      router.back();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function addManual() {
    setError(null);
    if (!name.trim()) return setError('Enter a name.');
    setBusy(true);
    try {
      const e = email.trim();
      const found = e && EMAIL_RE.test(e) ? await findUserByEmail(e) : null;
      await add.mutateAsync({
        display_name: name.trim(),
        email: e || null,
        phone: phone.trim() || null,
        user_id: found?.id ?? null,
      });
      router.back();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function importFromContacts() {
    setError(null);
    if (Platform.OS === 'web') return setError('Contacts are not available on web.');
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') return setError('Contacts permission was denied.');
      const contact = await Contacts.presentContactPickerAsync();
      if (!contact) return;
      const picked =
        contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ');
      setName(picked ?? '');
      setEmail(contact.emails?.[0]?.email ?? '');
      setPhone(contact.phoneNumbers?.[0]?.number ?? '');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Screen scroll contentStyle={{ gap: Spacing.four }}>
      <SegmentedControl<Mode>
        value={mode}
        onChange={setMode}
        options={[
          { value: 'email', label: 'By email' },
          { value: 'manual', label: 'Manual' },
        ]}
      />

      {mode === 'email' ? (
        <View style={{ gap: Spacing.three }}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="friend@example.com"
            autoFocus
          />
          <AppText variant="caption">
            If they already have an account we link it. Otherwise they're added as an invite and
            linked automatically when they sign up with this email.
          </AppText>
          {error ? (
            <AppText variant="caption" color="danger">
              {error}
            </AppText>
          ) : null}
          <Button title="Add member" onPress={addByEmail} loading={busy} />
        </View>
      ) : (
        <View style={{ gap: Spacing.three }}>
          <TextField label="Name" value={name} onChangeText={setName} placeholder="Full name" />
          <TextField
            label="Email (optional)"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="friend@example.com"
          />
          <TextField
            label="Phone (optional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+91 ..."
          />
          {Platform.OS !== 'web' ? (
            <Button title="Import from contacts" variant="secondary" onPress={importFromContacts} />
          ) : null}
          {error ? (
            <AppText variant="caption" color="danger">
              {error}
            </AppText>
          ) : null}
          <Button title="Add member" onPress={addManual} loading={busy} />
        </View>
      )}
      {Platform.OS === 'web' ? (
        <Button
          title="Cancel"
          variant="ghost"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
      ) : null}
    </Screen>
  );
}
