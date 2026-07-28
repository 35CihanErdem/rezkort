import { supabase } from '../lib/supabase';
import type { AuthActionResult } from '../types/auth';
import {
  mapProfileRow,
  type Profile,
  type ProfileRow,
  type UpdateProfileInput,
} from '../types/profile';
import {
  isValidTrMobile,
  isValidUsername,
  normalizePhone,
  normalizeUsername,
  toE164TR,
} from '../utils/phone';

const PROFILE_SELECT =
  'id,phone,email,first_name,last_name,username,role,phone_verified,email_verified,is_active,last_login_at,created_at,updated_at';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) return null;
  return mapProfileRow(data as ProfileRow);
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<AuthActionResult & { profile?: Profile }> {
  const patch: Record<string, string | boolean> = {};

  if (input.firstName !== undefined) {
    const v = input.firstName.trim();
    if (!v) return { ok: false, reason: 'Ad boş olamaz.' };
    patch.first_name = v;
  }
  if (input.lastName !== undefined) {
    const v = input.lastName.trim();
    if (!v) return { ok: false, reason: 'Soyad boş olamaz.' };
    patch.last_name = v;
  }
  if (input.username !== undefined) {
    const username = normalizeUsername(input.username);
    if (!isValidUsername(username)) {
      return {
        ok: false,
        reason: 'Kullanıcı adı 3–24 karakter, harf/rakam/._ olmalı.',
      };
    }
    patch.username = username;
  }
  if (input.phone !== undefined) {
    if (!isValidTrMobile(normalizePhone(input.phone))) {
      return { ok: false, reason: 'Geçerli bir cep numarası gir (05xx...).' };
    }
    const phone = toE164TR(input.phone);
    // İleride SMS OTP doğrulaması burada eklenecek.
    // Şimdilik telefon doğrudan güncellenir; phone_verified false kalır (veya açıkça set edilir).
    patch.phone = phone;
    patch.phone_verified =
      input.phoneVerified === true ? true : false;
  } else if (input.phoneVerified !== undefined) {
    patch.phone_verified = input.phoneVerified;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, reason: 'Güncellenecek alan yok.' };
  }

  if (typeof patch.first_name === 'string' || typeof patch.last_name === 'string') {
    const current = await fetchProfile(userId);
    if (current) {
      const first =
        typeof patch.first_name === 'string' ? patch.first_name : current.firstName;
      const last =
        typeof patch.last_name === 'string' ? patch.last_name : current.lastName;
      patch.full_name = `${first} ${last}`.trim();
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select(PROFILE_SELECT)
    .maybeSingle();

  if (error) {
    if (error.message.toLowerCase().includes('duplicate') || error.code === '23505') {
      return { ok: false, reason: 'Telefon veya kullanıcı adı zaten kullanılıyor.' };
    }
    return { ok: false, reason: error.message };
  }

  if (!data) {
    return { ok: false, reason: 'Profil güncellenemedi.' };
  }

  return { ok: true, profile: mapProfileRow(data as ProfileRow) };
}

/**
 * Telefon güncelleme — SMS doğrulaması yok (ileride eklenecek).
 * TODO(sms): OTP gönder → doğrula → phoneVerified: true ile updateProfile çağır.
 */
export async function updatePhone(
  userId: string,
  phoneInput: string,
): Promise<AuthActionResult & { profile?: Profile }> {
  return updateProfile(userId, {
    phone: phoneInput,
    phoneVerified: false,
  });
}

export async function syncProfileEmailFromAuth(
  userId: string,
  email: string,
): Promise<void> {
  await supabase
    .from('profiles')
    .update({ email, email_verified: true })
    .eq('id', userId);
}
