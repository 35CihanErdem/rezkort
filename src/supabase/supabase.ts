import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(raw: string): string {
  // createClient project root ister; /rest/v1 eklenirse auth path bozulur
  return raw.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
}

const supabaseUrl = normalizeSupabaseUrl(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
);
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

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