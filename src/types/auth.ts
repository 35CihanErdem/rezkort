import type { Session, User } from '@supabase/supabase-js';

export type AuthActionResult =
  | { ok: true; message?: string }
  | { ok: false; reason: string };

export type SignUpInput = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
};

export type SignInInput = {
  identifier: string;
  password: string;
};

export type AuthSessionState = {
  session: Session | null;
  user: User | null;
};
