import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

type Extra = {
  supabaseUrl?: string;
  supabaseKey?: string;
};

function normalizeSupabaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
}

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

const supabaseUrl = normalizeSupabaseUrl(
  extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '',
);
const supabaseKey =
  extra.supabaseKey ||
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY eksik',
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

/** Deep link / e-posta yönlendirme tabanı (şifre sıfırlama, e-posta değişimi) */
export const AUTH_REDIRECT_SCHEME = 'rezkort';
export const AUTH_RESET_PATH = 'reset-password';
export const AUTH_EMAIL_CHANGE_PATH = 'email-change';

export function getAuthRedirectUrl(path: string): string {
  return `${AUTH_REDIRECT_SCHEME}://${path}`;
}
