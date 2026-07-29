import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

export type AppErrorSource =
  | 'boot'
  | 'auth'
  | 'booking'
  | 'booking_refresh'
  | 'cancel'
  | 'map'
  | 'profile'
  | 'unknown';

type LogInput = {
  source: AppErrorSource | string;
  message: string;
  code?: string;
  error?: unknown;
  context?: Record<string, unknown>;
};

function errorMessage(error: unknown): string {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function errorStack(error: unknown): string | undefined {
  if (error instanceof Error && error.stack) return error.stack;
  return undefined;
}

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as { code?: unknown; name?: unknown };
  if (typeof e.code === 'string') return e.code;
  if (typeof e.name === 'string') return e.name;
  return undefined;
}

/** Fire-and-forget: asla UI'ı bloklamaz */
export function logAppError(input: LogInput): void {
  const message = input.message || errorMessage(input.error);
  const code = input.code ?? errorCode(input.error);
  const stack = errorStack(input.error);

  console.warn(`[${input.source}]`, message, input.error ?? '');

  void supabase
    .rpc('log_app_error', {
      p_source: input.source,
      p_message: message,
      p_code: code ?? null,
      p_stack: stack ?? null,
      p_context: input.context ?? {},
      p_app_version:
        Constants.expoConfig?.version ??
        Constants.nativeAppVersion ??
        null,
      p_platform: Platform.OS,
    })
    .then(({ error }) => {
      if (error) console.warn('log_app_error rpc failed', error.message);
    })
    .catch((e) => {
      console.warn('log_app_error failed', e);
    });
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = 'TIMEOUT',
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(label));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}
