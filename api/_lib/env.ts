/**
 * Server-side environment contract. Lives in api/ because that is the only place
 * the provider key may exist (CLAUDE.md §4.1).
 *
 * This is the guard that came back from src/lib/env.ts when the client module was
 * deleted: the client needs no variables, the server needs exactly one.
 */
import type { Result } from '../../src/lib/contracts';

export type EnvSource = Readonly<Record<string, string | undefined>>;

export const SERVER_KEY = 'GEMINI_API_KEY';

/**
 * Vite inlines every VITE_-prefixed variable into the client bundle, so a
 * provider key carrying that prefix is a published secret. Caught at startup
 * rather than by a reader of the shipped bundle (N1, L4, L11).
 */
const FORBIDDEN_CLIENT_PREFIX = 'VITE_';

export function readServerEnv(source: EnvSource): Result<{ apiKey: string }> {
  const prefixed = `${FORBIDDEN_CLIENT_PREFIX}${SERVER_KEY}`;
  const leaked = source[prefixed];
  if (leaked !== undefined && leaked.trim() !== '') {
    return {
      ok: false,
      // Never echoes the value: an error message reaches logs and pull requests.
      error: `${prefixed} is set. Vite inlines every ${FORBIDDEN_CLIENT_PREFIX} variable into the client bundle, which would publish this secret. Rename it to ${SERVER_KEY} and keep it server-side.`,
    };
  }

  const raw = source[SERVER_KEY];
  if (raw === undefined || raw.trim() === '') {
    return {
      ok: false,
      error: `Missing required environment variable: ${SERVER_KEY}. Set it as a server-side Vercel environment variable; never with a ${FORBIDDEN_CLIENT_PREFIX} prefix.`,
    };
  }

  return { ok: true, data: { apiKey: raw.trim() } };
}
