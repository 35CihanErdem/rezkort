import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { sendOtpEmail } from '../services/email';
import { User } from '../types';
import { createId } from '../utils/date';
import { isValidEmail, normalizeEmail } from '../utils/email';
import { hashPassword, verifyPassword } from '../utils/password';
import {
  formatPhoneDisplay,
  isValidTrMobile,
  isValidUsername,
  normalizePhone,
  normalizeUsername,
} from '../utils/phone';

const USERS_KEY = 'tenis.users.v2';
const SESSION_KEY = 'tenis.session.v1';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [pending, setPending] = useState<PendingSignup | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [usersRaw, sessionRaw] = await Promise.all([
          AsyncStorage.getItem(USERS_KEY),
          AsyncStorage.getItem(SESSION_KEY),
        ]);
        if (cancelled) return;

        const loadedUsers = usersRaw ? (JSON.parse(usersRaw) as User[]) : [];
        setUsers(loadedUsers);

        if (sessionRaw) {
          const sessionUserId = JSON.parse(sessionRaw) as string;
          const sessionUser = loadedUsers.find((u) => u.id === sessionUserId);
          if (sessionUser) setUser(sessionUser);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistUsers = useCallback(async (next: User[]) => {
    setUsers(next);
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(next));
  }, []);

  const persistSession = useCallback(async (next: User | null) => {
    setUser(next);
    if (next) {
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next.id));
    } else {
      await AsyncStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const startRegister = useCallback(
    async (input: {
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
    }) => {
      const firstName = input.firstName.trim();
      const lastName = input.lastName.trim();
      const phone = normalizePhone(input.phone);
      const email = normalizeEmail(input.email);

      if (!firstName || !lastName) {
        return { ok: false as const, reason: 'Ad ve soyad gerekli.' };
      }
      if (!isValidTrMobile(phone)) {
        return {
          ok: false as const,
          reason: 'Geçerli bir cep numarası gir (05xx...).',
        };
      }
      if (!isValidEmail(email)) {
        return { ok: false as const, reason: 'Geçerli bir e-posta gir.' };
      }
      if (users.some((u) => u.phone === phone)) {
        return {
          ok: false as const,
          reason:
            'Bu telefon zaten bir hesaba bağlı. Farklı e-posta ile tekrar kayıt olunamaz — giriş yap.',
        };
      }
      if (users.some((u) => u.email === email)) {
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
    [users],
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
      // E-posta doğrulanırken telefon hâlâ boşta mı? (ana hat = telefon)
      if (users.some((u) => u.phone === pending.phone)) {
        return {
          ok: false,
          reason:
            'Bu telefon az önce başka hesaba bağlandı. Farklı numarayla dene veya giriş yap.',
        };
      }
      if (users.some((u) => u.email === pending.email)) {
        return {
          ok: false,
          reason: 'Bu e-posta az önce kayıt oldu. Giriş yap.',
        };
      }
      setPending({ ...pending, emailVerified: true });
      return { ok: true };
    },
    [pending, users],
  );

  const completeRegister = useCallback(
    async (input: { username: string; password: string }) => {
      if (!pending?.emailVerified) {
        return {
          ok: false as const,
          reason: 'Önce e-postanı doğrula.',
        };
      }

      const username = normalizeUsername(input.username || pending.phone);
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
      if (users.some((u) => u.username === username)) {
        return {
          ok: false as const,
          reason: 'Bu kullanıcı adı alınmış.',
        };
      }
      if (users.some((u) => u.phone === pending.phone)) {
        return {
          ok: false as const,
          reason:
            'Bu telefon zaten kayıtlı. Ana kimlik telefon — farklı Gmail ile ikinci hesap açılamaz.',
        };
      }
      if (users.some((u) => u.email === pending.email)) {
        return {
          ok: false as const,
          reason: 'Bu e-posta zaten kayıtlı.',
        };
      }

      const id = createId('user');
      const passwordHash = await hashPassword(password, id);
      // E-posta doğrulandı → telefon + e-posta kalıcı bağlanır
      const nextUser: User = {
        id,
        firstName: pending.firstName,
        lastName: pending.lastName,
        phone: pending.phone,
        email: pending.email,
        username,
        passwordHash,
        createdAt: new Date().toISOString(),
      };

      await persistUsers([...users, nextUser]);
      await persistSession(nextUser);
      setPending(null);
      return { ok: true as const };
    },
    [pending, users, persistUsers, persistSession],
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

      const phone = normalizePhone(raw);
      const username = normalizeUsername(raw);
      const email = normalizeEmail(raw);
      const found = users.find(
        (u) =>
          u.email === email ||
          u.phone === phone ||
          u.username === username ||
          formatPhoneDisplay(u.phone).replace(/\s/g, '') ===
            raw.replace(/\s/g, ''),
      );

      if (!found) {
        return { ok: false as const, reason: 'Hesap bulunamadı.' };
      }

      const ok = await verifyPassword(
        input.password,
        found.id,
        found.passwordHash,
      );
      if (!ok) {
        return { ok: false as const, reason: 'Şifre hatalı.' };
      }

      await persistSession(found);
      return { ok: true as const };
    },
    [users, persistSession],
  );

  const logout = useCallback(async () => {
    setPending(null);
    await persistSession(null);
  }, [persistSession]);

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
