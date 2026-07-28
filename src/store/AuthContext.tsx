import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { sendOtpEmail } from '../services/email';
import { supabase } from '../supabase/supabase';
import { User } from '../types';
import { isValidEmail, normalizeEmail } from '../utils/email';
import {
  isValidTrMobile,
  isValidUsername,
  normalizePhone,
  normalizeUsername,
  toE164TR,
} from '../utils/phone';

type PendingSignup = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  otpCode: string;
  otpExpiresAt: number;
  emailVerified: boolean;
};

type AuthResult = { ok: true } | { ok: false; reason: string };

type AuthContextValue = {
  ready: boolean;
  user: User | null;
  pending: PendingSignup | null;
  startRegister: (input: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  }) => Promise<AuthResult & { demoCode?: string }>;
  resendOtp: () => Promise<AuthResult & { demoCode?: string }>;
  verifyOtp: (code: string) => AuthResult;
  completeRegister: (input: {
    username: string;
    password: string;
  }) => Promise<AuthResult>;
  login: (input: {
    identifier: string;
    password: string;
  }) => Promise<AuthResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function fullName(user: Pick<User, 'firstName' | 'lastName'>) {
  return `${user.firstName} ${user.lastName}`.trim();
}

export function displayName(user: User) {
  return fullName(user);
}

type ProfileRow = {
  id: string;
  phone: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string | null;
  role: User['role'];
  phone_verified: boolean;
  email_verified: boolean;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapProfile(row: ProfileRow): User {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    username: row.username ?? '',
    role: row.role,
    phoneVerified: row.phone_verified,
    emailVerified: row.email_verified,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [pending, setPending] = useState<PendingSignup | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id,phone,email,first_name,last_name,username,role,phone_verified,email_verified,is_active,last_login_at,created_at,updated_at',
      )
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      throw new Error('Profil bulunamadı.');
    }
    return mapProfile(data as ProfileRow);
  }, []);

  useEffect(() => {
    let alive = true;

    async function bootstrap() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user?.id) {
          const profile = await loadProfile(session.user.id);
          if (alive) setUser(profile);
        }
      } catch {
        if (alive) setUser(null);
      } finally {
        if (alive) setReady(true);
      }
    }

    bootstrap();

    // onAuthStateChange içinde await supabase çağrısı deadlock yapabiliyor
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      if (!session?.user?.id) {
        setUser(null);
        return;
      }
      const userId = session.user.id;
      setTimeout(() => {
        void loadProfile(userId)
          .then((profile) => {
            if (alive) setUser(profile);
          })
          .catch(() => {
            // Kayıt anında profil henüz yoksa completeRegister tamamlar
          });
      }, 0);
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const startRegister = useCallback(
    async (input: {
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
    }) => {
      const firstName = input.firstName.trim();
      const lastName = input.lastName.trim();
      const phone = toE164TR(input.phone);
      const email = normalizeEmail(input.email);

      if (!firstName || !lastName) {
        return { ok: false as const, reason: 'Ad ve soyad gerekli.' };
      }
      if (!isValidTrMobile(normalizePhone(input.phone))) {
        return {
          ok: false as const,
          reason: 'Geçerli bir cep numarası gir (05xx...).',
        };
      }
      if (!isValidEmail(email)) {
        return { ok: false as const, reason: 'Geçerli bir e-posta gir.' };
      }

      const { data: availability, error: availabilityError } = await supabase.rpc(
        'check_signup_availability',
        { p_phone: phone, p_email: email, p_username: null },
      );
      if (availabilityError) {
        return { ok: false as const, reason: availabilityError.message };
      }
      const flags = (availability ?? {}) as {
        phone_taken?: boolean;
        email_taken?: boolean;
      };
      if (flags.phone_taken) {
        return {
          ok: false as const,
          reason:
            'Bu telefon zaten bir hesaba bağlı. Farklı e-posta ile tekrar kayıt olunamaz — giriş yap.',
        };
      }
      if (flags.email_taken) {
        return {
          ok: false as const,
          reason:
            'Bu e-posta zaten kayıtlı. Telefonun başka bir hesapta olabilir; giriş yap.',
        };
      }

      try {
        const mail = await sendOtpEmail({
          email,
          name: `${firstName} ${lastName}`,
        });
        setPending({
          firstName,
          lastName,
          phone,
          email,
          otpCode: mail.code,
          otpExpiresAt: Date.now() + 5 * 60 * 1000,
          emailVerified: false,
        });
        return {
          ok: true as const,
          demoCode: mail.demo ? mail.code : undefined,
        };
      } catch (e) {
        return {
          ok: false as const,
          reason:
            e instanceof Error ? e.message : 'E-posta gönderilemedi.',
        };
      }
    },
    [],
  );

  const resendOtp = useCallback(async () => {
    if (!pending) {
      return { ok: false as const, reason: 'Kayıt oturumu yok.' };
    }
    try {
      const mail = await sendOtpEmail({
        email: pending.email,
        name: `${pending.firstName} ${pending.lastName}`,
      });
      setPending({
        ...pending,
        otpCode: mail.code,
        otpExpiresAt: Date.now() + 5 * 60 * 1000,
        emailVerified: false,
      });
      return {
        ok: true as const,
        demoCode: mail.demo ? mail.code : undefined,
      };
    } catch (e) {
      return {
        ok: false as const,
        reason: e instanceof Error ? e.message : 'E-posta gönderilemedi.',
      };
    }
  }, [pending]);

  const verifyOtp = useCallback(
    (code: string): AuthResult => {
      if (!pending) {
        return { ok: false, reason: 'Kayıt oturumu yok.' };
      }
      if (Date.now() > pending.otpExpiresAt) {
        return { ok: false, reason: 'Kodun süresi doldu. Yeniden gönder.' };
      }
      if (code.trim() !== pending.otpCode) {
        return { ok: false, reason: 'Doğrulama kodu hatalı.' };
      }
      setPending({ ...pending, emailVerified: true });
      return { ok: true };
    },
    [pending],
  );

  const completeRegister = useCallback(
    async (input: { username: string; password: string }) => {
      if (!pending?.emailVerified) {
        return {
          ok: false as const,
          reason: 'Önce e-postanı doğrula.',
        };
      }

      const defaultUsername = pending.phone.replace('+', '');
      const username = normalizeUsername(input.username || defaultUsername);
      const password = input.password;

      if (!isValidUsername(username)) {
        return {
          ok: false as const,
          reason: 'Kullanıcı adı 3–24 karakter, harf/rakam/._ olmalı.',
        };
      }
      if (password.length < 6) {
        return {
          ok: false as const,
          reason: 'Şifre en az 6 karakter olmalı.',
        };
      }

      try {
        const { data: availability, error: availabilityError } = await supabase.rpc(
          'check_signup_availability',
          {
            p_phone: pending.phone,
            p_email: pending.email,
            p_username: username,
          },
        );
        if (availabilityError) {
          return { ok: false as const, reason: availabilityError.message };
        }
        const flags = (availability ?? {}) as {
          phone_taken?: boolean;
          email_taken?: boolean;
          username_taken?: boolean;
        };
        if (flags.username_taken) {
          return {
            ok: false as const,
            reason: 'Bu kullanıcı adı alınmış.',
          };
        }
        if (flags.phone_taken) {
          return {
            ok: false as const,
            reason:
              'Bu telefon zaten kayıtlı. Ana kimlik telefon — farklı Gmail ile ikinci hesap açılamaz.',
          };
        }
        if (flags.email_taken) {
          return {
            ok: false as const,
            reason: 'Bu e-posta zaten kayıtlı.',
          };
        }

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: pending.email,
          password,
          options: {
            data: {
              phone: pending.phone,
              first_name: pending.firstName,
              last_name: pending.lastName,
              username,
              phone_verified: true,
            },
          },
        });
        if (signUpError) {
          return { ok: false as const, reason: signUpError.message };
        }

        const createdUserId = signUpData.user?.id;
        if (!createdUserId) {
          return {
            ok: false as const,
            reason:
              'Hesap oluşturuldu ama oturum alınamadı. Supabase Email Confirm ayarını kontrol et.',
          };
        }

        if (!signUpData.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: pending.email,
            password,
          });
          if (signInError) {
            return { ok: false as const, reason: signInError.message };
          }
        }

        // Trigger çoğu zaman yeterli; RPC opsiyonel tamamlayıcı
        const { error: profileError } = await supabase.rpc('upsert_own_profile', {
          p_phone: pending.phone,
          p_email: pending.email,
          p_first_name: pending.firstName,
          p_last_name: pending.lastName,
          p_username: username,
        });
        if (profileError && profileError.message !== 'NOT_AUTHENTICATED') {
          // Profil trigger ile oluşmuş olabilir; yine de okumayı dene
          console.warn('upsert_own_profile:', profileError.message);
        }

        let profile: User | null = null;
        try {
          profile = await loadProfile(createdUserId);
        } catch {
          // Profil okunamazsa pending'den geçici user ile devam et
          profile = {
            id: createdUserId,
            firstName: pending.firstName,
            lastName: pending.lastName,
            phone: pending.phone,
            email: pending.email,
            username,
            role: 'citizen',
            phoneVerified: true,
            emailVerified: true,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }

        setUser(profile);
        setPending(null);
        return { ok: true as const };
      } catch (e) {
        return {
          ok: false as const,
          reason: e instanceof Error ? e.message : 'Kayıt tamamlanamadı.',
        };
      }
    },
    [pending, loadProfile],
  );

  const login = useCallback(
    async (input: { identifier: string; password: string }) => {
      const raw = input.identifier.trim();
      if (!raw || !input.password) {
        return {
          ok: false as const,
          reason: 'E-posta / telefon / kullanıcı adı ve şifre gerekli.',
        };
      }

      const { data: resolvedEmail, error: lookupError } = await supabase.rpc(
        'resolve_login_email',
        { p_identifier: raw },
      );
      if (lookupError) {
        return { ok: false as const, reason: lookupError.message };
      }
      if (!resolvedEmail) {
        return { ok: false as const, reason: 'Hesap bulunamadı.' };
      }

      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: resolvedEmail as string,
          password: input.password,
        });
      if (signInError) {
        return { ok: false as const, reason: signInError.message };
      }

      const userId = signInData.user?.id;
      if (!userId) {
        return { ok: false as const, reason: 'Oturum açılamadı.' };
      }

      const profile = await loadProfile(userId);
      setUser(profile);
      return { ok: true as const };
    },
    [loadProfile],
  );

  const logout = useCallback(async () => {
    setPending(null);
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      user,
      pending,
      startRegister,
      resendOtp,
      verifyOtp,
      completeRegister,
      login,
      logout,
    }),
    [
      ready,
      user,
      pending,
      startRegister,
      resendOtp,
      verifyOtp,
      completeRegister,
      login,
      logout,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth AuthProvider içinde kullanılmalı');
  }
  return ctx;
}
