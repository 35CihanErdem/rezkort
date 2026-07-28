import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
}

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseKey?: string;
};

const supabaseUrl = normalizeSupabaseUrl(
  extra.supabaseUrl ||
    process.env.EXPO_PUBLIC_SUPABASE_URL ||
    '',
);
const supabaseKey =
  extra.supabaseKey ||
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Supabase env eksik: EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export function getSupabaseConfigStatus() {
  return {
    hasUrl: Boolean(supabaseUrl),
    hasKey: Boolean(supabaseKey),
    urlHost: supabaseUrl ? supabaseUrl.replace(/^https?:\/\//, '') : '',
  };
}
