import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** True once real project credentials (not the scaffold placeholders) are set. */
export const isSupabaseConfigured =
  !!url &&
  !!anonKey &&
  !url.includes('placeholder') &&
  !anonKey.includes('placeholder');

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] Using placeholder credentials. Set EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY in .env, then restart with `npx expo start -c`.'
  );
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', {
  auth: {
    // React Native has no URL-based session; persist via AsyncStorage instead.
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh the auth token only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
