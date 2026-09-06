/**
 * The single adapter. All provider traffic goes through here, so the provider
 * can be swapped in one file (CLAUDE.md §4.2) and so the call counter N2 demands
 * cannot be bypassed by a second code path.
 *
 * Contract: specs/specification.md §3.5.
 *   - key in the x-goog-api-key header, never ?key= (N9)
 *   - model pinned to an explicit version, never a moving alias (N8)
 *   - deterministic validation supplied by the caller (N5, CLAUDE.md §4.3)
 *   - retry exactly once, and only for timeout or malformed (N5)
 *   - bounded per attempt and in total (N6)
 *   - returns { ok, data } | { ok, error }; throws nothing across the boundary
 */
import {
  MAX_ATTEMPTS,
  REQUEST_TIMEOUT_MS,
  TOTAL_BUDGET_MS,
  type ModelFailure,
  type ModelResult,
  type Result,
} from '../../src/lib/contracts.js';
import { stripJsonFence } from '../../src/lib/schema.js';

/** N8: an explicit version. A moving alias makes behaviour unreproducible. */
export const MODEL_ID = 'models/gemini-3.1-flash-lite';

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/${MODEL_ID}:generateContent`;

// N2's accounting lives here because this is the only place every call passes
// through. Attempts are counted, so a retry is visible to the assertion.
let attemptCount = 0;
export function modelCallCount(): number {
  return attemptCount;
}
export function resetModelCallCount(): void {
  attemptCount = 0;
}

export type CallModelInput<T> = {
  systemInstruction: string;
  userText: string;
  parse: (raw: unknown) => Result<T>;
};

export type CallModelDeps = {
  apiKey: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
};

export function buildRequest(
  systemInstruction: string,
  userText: string,
  apiKey: string,
  signal: AbortSignal,
): { url: string; init: RequestInit } {
  return {
    url: ENDPOINT,
    init: {
      method: 'POST',
      headers: {
        // N9: the header form. The ?key= query form appears nowhere.
        'x-goog-api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        // Constrain the shape at the API level, not only by asking politely.
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      }),
      signal,
    },
  };
}

function extractText(payload: unknown): Result<string> {
  if (typeof payload !== 'object' || payload === null) {
    return { ok: false, error: 'provider response was not an object' };
  }
  const candidates = (payload as Record<string, unknown>)['candidates'];
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { ok: false, error: 'provider response contained no candidates' };
  }
  const first: unknown = candidates[0];
  if (typeof first !== 'object' || first === null) {
    return { ok: false, error: 'candidate was not an object' };
  }
  const content = (first as Record<string, unknown>)['content'];
  if (typeof content !== 'object' || content === null) {
    return { ok: false, error: 'candidate contained no content' };
  }
  const parts = (content as Record<string, unknown>)['parts'];
  if (!Array.isArray(parts) || parts.length === 0) {
    return { ok: false, error: 'content contained no parts' };
  }
  const text = parts
    .map((part) =>
      typeof part === 'object' && part !== null && 'text' in part
        ? typeof (part as { text: unknown }).text === 'string'
          ? (part as { text: string }).text
          : ''
        : '',
    )
    .join('');
  if (text.trim() === '') return { ok: false, error: 'provider returned empty text' };
  return { ok: true, data: text };
}

type AttemptOutcome<T> = { ok: true; data: T } | { ok: false; error: ModelFailure };

async function attempt<T>(
  input: CallModelInput<T>,
  deps: Required<Pick<CallModelDeps, 'apiKey'>> & { fetchImpl: typeof fetch },
  budgetMs: number,
): Promise<AttemptOutcome<T>> {
  const controller = new AbortController();
  let timedOut = false;
  // Explicit setTimeout rather than AbortSignal.timeout, so fake timers control it.
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, Math.min(REQUEST_TIMEOUT_MS, budgetMs));

  try {
    const { url, init } = buildRequest(
      input.systemInstruction,
      input.userText,
      deps.apiKey,
      controller.signal,
    );
    const response = await deps.fetchImpl(url, init);

    if (!response.ok) {
      const kind = response.status >= 400 && response.status < 500 ? 'refused' : 'transport';
      return { ok: false, error: { kind, status: response.status } };
    }

    const payload: unknown = await response.json();
    const text = extractText(payload);
    if (!text.ok) return { ok: false, error: { kind: 'malformed', detail: text.error } };

    let parsedJson: unknown;
    try {
      // The one permitted normalisation, then a plain parse. No repair.
      parsedJson = JSON.parse(stripJsonFence(text.data));
    } catch {
      return { ok: false, error: { kind: 'malformed', detail: 'response was not valid JSON' } };
    }

    const validated = input.parse(parsedJson);
    if (!validated.ok) return { ok: false, error: { kind: 'malformed', detail: validated.error } };

    return { ok: true, data: validated.data };
  } catch {
    if (timedOut) return { ok: false, error: { kind: 'timeout' } };
    return { ok: false, error: { kind: 'transport', status: 0 } };
  } finally {
    clearTimeout(timer);
  }
}

export async function callModel<T>(
  input: CallModelInput<T>,
  deps: CallModelDeps,
): Promise<ModelResult<T>> {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch;
  const now = deps.now ?? Date.now;
  const startedAt = now();

  let last: ModelFailure = { kind: 'transport', status: 0 };

  for (let n = 0; n < MAX_ATTEMPTS; n += 1) {
    const remaining = TOTAL_BUDGET_MS - (now() - startedAt);
    if (remaining <= 0) return { ok: false, error: { kind: 'timeout' } };

    attemptCount += 1;
    const outcome = await attempt(input, { apiKey: deps.apiKey, fetchImpl }, remaining);
    if (outcome.ok) return { ok: true, data: outcome.data };

    last = outcome.error;

    // N5: retry exactly once, and only where a retry could plausibly succeed.
    // A refused request has been rejected on its merits; repeating it spends
    // budget N2 accounts for and cannot succeed.
    if (last.kind !== 'timeout' && last.kind !== 'malformed') break;
  }

  return { ok: false, error: last };
}
