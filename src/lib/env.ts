/**
 * Reads the environment variables the app cannot start without, and reports a
 * missing one by name rather than failing later at the point of use.
 *
 * Pure: the caller supplies the source record, so this module has no I/O and is
 * testable without touching process.env or import.meta.env.
 */

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export type EnvSource = Readonly<Record<string, string | undefined>>;

export const CLIENT_ENV_KEYS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;
export const SERVER_ENV_KEYS = ['GEMINI_API_KEY'] as const;

export type ClientEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export type ServerEnv = {
  geminiApiKey: string;
};

/**
 * Vite inlines every VITE_-prefixed variable into the client bundle, so a
 * provider key carrying that prefix is a published secret. Named here so the
 * failure is caught at startup rather than by a reader of the shipped bundle.
 */
const FORBIDDEN_CLIENT_PREFIX = 'VITE_';

function readAll<K extends string>(source: EnvSource, keys: readonly K[]): Result<Record<K, string>> {
  const values = {} as Record<K, string>;
  const missing: K[] = [];

  for (const key of keys) {
    const raw = source[key];
    if (raw === undefined || raw.trim() === '') {
      missing.push(key);
    } else {
      values[key] = raw.trim();
    }
  }

  if (missing.length > 0) {
    const label = missing.length === 1 ? 'variable' : 'variables';
    return {
      ok: false,
      error: `Missing required environment ${label}: ${missing.join(', ')}. Copy .env.example and fill in a value for each.`,
    };
  }

  return { ok: true, data: values };
}

export function readClientEnv(source: EnvSource): Result<ClientEnv> {
  const result = readAll(source, CLIENT_ENV_KEYS);
  if (!result.ok) return result;

  return {
    ok: true,
    data: {
      supabaseUrl: result.data.VITE_SUPABASE_URL,
      supabaseAnonKey: result.data.VITE_SUPABASE_ANON_KEY,
    },
  };
}

export function readServerEnv(source: EnvSource): Result<ServerEnv> {
  for (const key of SERVER_ENV_KEYS) {
    const prefixed = `${FORBIDDEN_CLIENT_PREFIX}${key}`;
    const value = source[prefixed];
    if (value !== undefined && value.trim() !== '') {
      return {
        ok: false,
        error: `${prefixed} is set. Vite inlines every ${FORBIDDEN_CLIENT_PREFIX} variable into the client bundle, which would publish this secret. Rename it to ${key} and keep it server-side.`,
      };
    }
  }

  const result = readAll(source, SERVER_ENV_KEYS);
  if (!result.ok) return result;

  return { ok: true, data: { geminiApiKey: result.data.GEMINI_API_KEY } };
}
