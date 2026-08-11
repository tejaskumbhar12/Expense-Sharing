import * as Contacts from 'expo-contacts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { AppText, Avatar, Button, Card, Divider, Screen, SegmentedControl, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { findUserByEmail, useAddMember, useGroupMembers } from '@/lib/queries/members';
import { useKnownPeople, type KnownPerson } from '@/lib/queries/people';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Mode = 'email' | 'manual';

export default function AddMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const add = useAddMember(id);
  const members = useGroupMembers(id);
  const known = useKnownPeople();

  const [mode, setMode] = useState<Mode>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const keyOf = (p: KnownPerson) =>
    p.user_id
      ? `u:${p.user_id}`
      : p.email
        ? `e:${p.email.toLowerCase()}`
        : `n:${p.display_name.toLowerCase()}`;

  // People from the user's other groups who aren't already in this one.
  const candidates = useMemo(() => {
    const memberUserIds = new Set(
      (members.data ?? []).map((m) => m.user_id).filter((v): v is string => !!v)
    );
    const memberEmails = new Set(
      (members.data ?? []).map((m) => m.email?.toLowerCase()).filter((v): v is string => !!v)
    );
    return (known.data ?? []).filter((p) => {
      if (p.user_id && memberUserIds.has(p.user_id)) return false;
      if (p.email && memberEmails.has(p.email.toLowerCase())) return false;
      return true;
    });
  }, [known.data, members.data]);

  async function addKnown(p: KnownPerson) {
    setError(null);
    const key = keyOf(p);
    setAddedKeys((prev) => new Set(prev).add(key)); // hide immediately so it can't be re-added
    try {
      await add.mutateAsync({ display_name: p.display_name, email: p.email, user_id: p.user_id });
      setLastAdded(p.display_name);
    } catch (err) {
      setAddedKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setError((err as Error).message);
    }
  }

  const q = search.trim().toLowerCase();
  const filteredCandidates = candidates.filter((p) => {
    if (addedKeys.has(keyOf(p))) return false;
    if (!q) return true;
    return p.display_name.toLowerCase().includes(q) || (p.email ?? '').toLowerCase().includes(q);
  });

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
      {candidates.length > 0 ? (
        <View style={{ gap: Spacing.two }}>
          <AppText variant="label">From your groups</AppText>
          <TextField
            placeholder="Search name or email"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
          {lastAdded ? (
            <AppText variant="caption" color="success">
              ✓ Added {lastAdded}
            </AppText>
          ) : null}
          <Card style={{ padding: 0, paddingHorizontal: Spacing.four, maxHeight: 260 }}>
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {filteredCandidates.length === 0 ? (
                <AppText variant="caption" style={{ paddingVertical: Spacing.three }}>
                  No matches.
                </AppText>
              ) : (
                filteredCandidates.map((p, i) => (
                  <View key={p.user_id ?? p.email ?? p.display_name}>
                    {i > 0 ? <Divider /> : null}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: Spacing.three,
                        paddingVertical: Spacing.three,
                      }}
                    >
                      <Avatar name={p.display_name} size={36} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <AppText variant="body" style={{ fontWeight: '600' }}>
                          {p.display_name}
                        </AppText>
                        {p.email ? <AppText variant="caption">{p.email}</AppText> : null}
                      </View>
                      <Button
                        title="Add"
                        variant="ghost"
                        onPress={() => addKnown(p)}
                        disabled={add.isPending}
                      />
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </Card>
          <AppText variant="caption">Or add someone new below.</AppText>
        </View>
      ) : null}

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
