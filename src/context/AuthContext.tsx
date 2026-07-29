import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as authService from '../services/auth.service';
import * as profileService from '../services/profile.service';
import type { AuthActionResult, SignInInput, SignUpInput } from '../types/auth';
import { displayName, type Profile } from '../types/profile';
import { logAppError, withTimeout } from '../utils/errorLog';

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  /** @deprecated use loading — geriye uyumluluk */
  ready: boolean;
  passwordRecovery: boolean;
  signIn: (input: SignInInput) => Promise<AuthActionResult>;
  signUp: (input: SignUpInput) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
  resetPassword: (email: string) => Promise<AuthActionResult>;
  updatePassword: (password: string) => Promise<AuthActionResult>;
  updateEmail: (email: string) => Promise<AuthActionResult>;
  updatePhone: (phone: string) => Promise<AuthActionResult>;
  updateProfile: (
    input: Parameters<typeof profileService.updateProfile>[1],
  ) => Promise<AuthActionResult>;
  refreshProfile: () => Promise<void>;
  clearPasswordRecovery: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export { displayName };

async function createSessionFromUrl(url: string): Promise<boolean> {
  try {
    const parsed = Linking.parse(url);
    const queryParams = parsed.queryParams ?? {};
    const code = typeof queryParams.code === 'string' ? queryParams.code : null;

    if (code) {
      const { error } = await (
        await import('../lib/supabase')
      ).supabase.auth.exchangeCodeForSession(code);
      return !error;
    }

    // Implicit flow: access_token / refresh_token hash veya query'de olabilir
    const hash = url.includes('#') ? url.split('#')[1] : '';
    const hashParams = new URLSearchParams(hash);
    const accessToken =
      hashParams.get('access_token') ||
      (typeof queryParams.access_token === 'string'
        ? queryParams.access_token
        : null);
    const refreshToken =
      hashParams.get('refresh_token') ||
      (typeof queryParams.refresh_token === 'string'
        ? queryParams.refresh_token
        : null);

    if (accessToken && refreshToken) {
      const { error } = await (
        await import('../lib/supabase')
      ).supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      return !error;
    }
  } catch (e) {
    console.warn('createSessionFromUrl:', e);
  }
  return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  const refreshProfile = useCallback(async () => {
    const userId = (await authService.getSession()).data.session?.user?.id;
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      const next = await profileService.fetchProfile(userId);
      setProfile(next);
      if (next && user?.email && next.email !== user.email) {
        await profileService.syncProfileEmailFromAuth(userId, user.email);
        const synced = await profileService.fetchProfile(userId);
        setProfile(synced);
      }
    } catch (e) {
      console.warn('refreshProfile:', e);
      logAppError({
        source: 'profile',
        message: 'refreshProfile failed',
        error: e,
      });
    }
  }, [user?.email]);

  const applySession = useCallback(async (next: Session | null) => {
    setSession(next);
    setUser(next?.user ?? null);
    if (!next?.user?.id) {
      setProfile(null);
      return;
    }
    try {
      let nextProfile = await profileService.fetchProfile(next.user.id);
      if (!nextProfile) {
        const meta = next.user.user_metadata ?? {};
        await (
          await import('../lib/supabase')
        ).supabase.rpc('upsert_own_profile', {
          p_phone: (meta.phone as string) || '+900000000000',
          p_email: next.user.email ?? '',
          p_first_name: (meta.first_name as string) || 'Kullanıcı',
          p_last_name: (meta.last_name as string) || 'Yeni',
          p_username:
            (meta.username as string) ||
            (next.user.email?.split('@')[0] ?? next.user.id.slice(0, 12)),
        });
        nextProfile = await profileService.fetchProfile(next.user.id);
      }
      if (
        nextProfile &&
        next.user.email &&
        nextProfile.email !== next.user.email
      ) {
        await profileService.syncProfileEmailFromAuth(
          next.user.id,
          next.user.email,
        );
        nextProfile = await profileService.fetchProfile(next.user.id);
      }
      setProfile(nextProfile);
    } catch (e) {
      console.warn('applySession profile:', e);
      logAppError({
        source: 'auth',
        message: 'applySession profile failed',
        error: e,
        context: { userId: next.user.id },
      });
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    async function bootstrap() {
      try {
        await withTimeout(
          (async () => {
            const initialUrl = await Linking.getInitialURL();
            if (initialUrl) {
              await createSessionFromUrl(initialUrl);
            }

            const { data } = await authService.getSession();
            if (!alive) return;
            await applySession(data.session);
          })(),
          20_000,
          'AUTH_BOOT_TIMEOUT',
        );
      } catch (e) {
        logAppError({
          source: 'auth',
          message:
            e instanceof Error && e.message === 'AUTH_BOOT_TIMEOUT'
              ? 'Auth bootstrap timeout'
              : 'Auth bootstrap failed',
          error: e,
        });
      } finally {
        if (alive) setLoading(false);
      }
    }

    bootstrap();

    const sub = Linking.addEventListener('url', ({ url }) => {
      void createSessionFromUrl(url);
    });

    const { data: authSub } = authService.onAuthStateChange(
      (event, nextSession) => {
        if (!alive) return;
        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecovery(true);
        }
        // Deadlock önlemek için async işi ertele
        setTimeout(() => {
          void applySession(nextSession);
        }, 0);
      },
    );

    return () => {
      alive = false;
      sub.remove();
      authSub.subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(async (input: SignInInput) => {
    const result = await authService.signIn(input);
    if (result.ok) {
      const { data } = await authService.getSession();
      await applySession(data.session);
    }
    return result;
  }, [applySession]);

  const signUp = useCallback(async (input: SignUpInput) => {
    return authService.signUp(input);
  }, []);

  const signOut = useCallback(async () => {
    const result = await authService.signOut();
    setPasswordRecovery(false);
    setSession(null);
    setUser(null);
    setProfile(null);
    return result;
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    return authService.resetPassword(email);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const result = await authService.updatePassword(password);
    if (result.ok) setPasswordRecovery(false);
    return result;
  }, []);

  const updateEmail = useCallback(async (email: string) => {
    return authService.updateAuthEmail(email);
  }, []);

  const updatePhoneFn = useCallback(
    async (phone: string) => {
      if (!user?.id) return { ok: false as const, reason: 'Oturum yok.' };
      const result = await profileService.updatePhone(user.id, phone);
      if (result.ok && result.profile) setProfile(result.profile);
      return result;
    },
    [user?.id],
  );

  const updateProfileFn = useCallback(
    async (input: Parameters<typeof profileService.updateProfile>[1]) => {
      if (!user?.id) return { ok: false as const, reason: 'Oturum yok.' };
      const result = await profileService.updateProfile(user.id, input);
      if (result.ok && result.profile) setProfile(result.profile);
      return result;
    },
    [user?.id],
  );

  const clearPasswordRecovery = useCallback(() => {
    setPasswordRecovery(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      session,
      loading,
      ready: !loading,
      passwordRecovery,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      updateEmail,
      updatePhone: updatePhoneFn,
      updateProfile: updateProfileFn,
      refreshProfile,
      clearPasswordRecovery,
    }),
    [
      user,
      profile,
      session,
      loading,
      passwordRecovery,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      updateEmail,
      updatePhoneFn,
      updateProfileFn,
      refreshProfile,
      clearPasswordRecovery,
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
