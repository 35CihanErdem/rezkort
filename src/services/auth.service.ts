import { getAuthRedirectUrl, supabase } from '../lib/supabase';
import type { AuthActionResult, SignInInput, SignUpInput } from '../types/auth';
import { isValidEmail, normalizeEmail } from '../utils/email';
import {
  isValidTrMobile,
  isValidUsername,
  normalizePhone,
  normalizeUsername,
  toE164TR,
} from '../utils/phone';

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('email not confirmed')) {
    return 'E-posta henüz doğrulanmadı. Gelen kutunu (ve spam) kontrol et.';
  }
  if (lower.includes('invalid login credentials')) {
    return 'E-posta veya şifre hatalı.';
  }
  if (lower.includes('user already registered')) {
    return 'Bu e-posta zaten kayıtlı. Giriş yap veya şifre sıfırla.';
  }
  if (lower.includes('password')) {
    return message;
  }
  return message;
}

async function checkAvailability(input: {
  phone: string;
  email: string;
  username?: string;
}): Promise<AuthActionResult> {
  const { data, error } = await supabase.rpc('check_signup_availability', {
    p_phone: input.phone,
    p_email: input.email,
    p_username: input.username ?? null,
  });

  if (error) {
    return { ok: false, reason: error.message };
  }

  const flags = (data ?? {}) as {
    phone_taken?: boolean;
    email_taken?: boolean;
    username_taken?: boolean;
  };

  if (flags.phone_taken) {
    return {
      ok: false,
      reason: 'Bu telefon zaten bir hesaba bağlı. Giriş yap.',
    };
  }
  if (flags.email_taken) {
    return {
      ok: false,
      reason: 'Bu e-posta zaten kayıtlı. Giriş yap.',
    };
  }
  if (flags.username_taken) {
    return { ok: false, reason: 'Bu kullanıcı adı alınmış.' };
  }

  return { ok: true };
}

export async function resolveLoginEmail(
  identifier: string,
): Promise<{ email: string | null; error?: string }> {
  const raw = identifier.trim();
  if (!raw) return { email: null };

  if (raw.includes('@')) {
    return { email: normalizeEmail(raw) };
  }

  const { data, error } = await supabase.rpc('resolve_login_email', {
    p_identifier: raw,
  });

  if (error) {
    return { email: null, error: error.message };
  }

  return { email: (data as string | null) ?? null };
}

export async function signUp(input: SignUpInput): Promise<AuthActionResult> {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const phone = toE164TR(input.phone);
  const email = normalizeEmail(input.email);
  const password = input.password;
  const username = normalizeUsername(input.username);

  if (!firstName || !lastName) {
    return { ok: false, reason: 'Ad ve soyad gerekli.' };
  }
  if (!isValidUsername(username)) {
    return {
      ok: false,
      reason: 'Kullanıcı adı 3–24 karakter, harf/rakam/._ olmalı.',
    };
  }
  if (!isValidTrMobile(normalizePhone(input.phone))) {
    return { ok: false, reason: 'Geçerli bir cep numarası gir (05xx...).' };
  }
  if (!isValidEmail(email)) {
    return { ok: false, reason: 'Geçerli bir e-posta gir.' };
  }
  if (password.length < 6) {
    return { ok: false, reason: 'Şifre en az 6 karakter olmalı.' };
  }

  const availability = await checkAvailability({ phone, email, username });
  if (!availability.ok) return availability;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl('email-confirmed'),
      data: {
        phone,
        first_name: firstName,
        last_name: lastName,
        username,
        phone_verified: false,
      },
    },
  });

  if (error) {
    return { ok: false, reason: mapAuthError(error.message) };
  }

  if (!data.user) {
    return { ok: false, reason: 'Kayıt oluşturulamadı.' };
  }

  // Email confirm açıkken session gelmez; profil trigger ile oluşur.
  // Session varsa profili güvenlik için upsert ile de sağlamlaştır.
  if (data.session?.user.id) {
    const { error: profileError } = await supabase.rpc('upsert_own_profile', {
      p_phone: phone,
      p_email: email,
      p_first_name: firstName,
      p_last_name: lastName,
      p_username: username,
    });
    if (profileError) {
      console.warn('upsert_own_profile:', profileError.message);
    }
  }

  return {
    ok: true,
    message:
      'Hesap oluşturuldu. Giriş yapmadan önce e-postandaki doğrulama linkine tıkla.',
  };
}

export async function signIn(input: SignInInput): Promise<AuthActionResult> {
  const raw = input.identifier.trim();
  if (!raw || !input.password) {
    return {
      ok: false,
      reason: 'E-posta / telefon / kullanıcı adı ve şifre gerekli.',
    };
  }

  const resolved = await resolveLoginEmail(raw);
  if (resolved.error) {
    return {
      ok: false,
      reason: `Hesap aranamadı: ${resolved.error}`,
    };
  }
  if (!resolved.email) {
    return {
      ok: false,
      reason: 'Hesap bulunamadı. E-posta, telefon veya kullanıcı adını kontrol et.',
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: resolved.email,
    password: input.password,
  });

  if (error) {
    return { ok: false, reason: mapAuthError(error.message) };
  }

  return { ok: true };
}

export async function signOut(): Promise<AuthActionResult> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

export async function resetPassword(emailInput: string): Promise<AuthActionResult> {
  const email = normalizeEmail(emailInput);
  if (!isValidEmail(email)) {
    return { ok: false, reason: 'Geçerli bir e-posta gir.' };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getAuthRedirectUrl('reset-password'),
  });

  if (error) {
    return { ok: false, reason: mapAuthError(error.message) };
  }

  return {
    ok: true,
    message: 'Şifre sıfırlama bağlantısı e-postana gönderildi.',
  };
}

export async function updatePassword(password: string): Promise<AuthActionResult> {
  if (password.length < 6) {
    return { ok: false, reason: 'Şifre en az 6 karakter olmalı.' };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, reason: mapAuthError(error.message) };
  }

  return { ok: true, message: 'Şifren güncellendi. Giriş yapabilirsin.' };
}

export async function updateAuthEmail(newEmail: string): Promise<AuthActionResult> {
  const email = normalizeEmail(newEmail);
  if (!isValidEmail(email)) {
    return { ok: false, reason: 'Geçerli bir e-posta gir.' };
  }

  const { error } = await supabase.auth.updateUser({
    email,
  });

  if (error) {
    return { ok: false, reason: mapAuthError(error.message) };
  }

  return {
    ok: true,
    message:
      'Doğrulama maili yeni adresine gönderildi. Onaylamadan e-posta değişmez.',
  };
}

export async function getSession() {
  return supabase.auth.getSession();
}

export function onAuthStateChange(
  callback: (
    event: import('@supabase/supabase-js').AuthChangeEvent,
    session: import('@supabase/supabase-js').Session | null,
  ) => void,
) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}
