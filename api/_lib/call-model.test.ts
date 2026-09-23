// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MODEL_ID,
  buildRequest,
  callModel,
  modelCallCount,
  resetModelCallCount,
} from './call-model.js';
import { readServerEnv } from './env.js';
import {
  MAX_CALLS_PER_CYCLE,
  CALLS_ON_SUCCESS,
  REQUEST_TIMEOUT_MS,
  type Result,
} from '../../src/lib/contracts.js';

const parseEcho = (raw: unknown): Result<{ value: string }> => {
  if (typeof raw === 'object' && raw !== null && 'value' in raw) {
    if (typeof raw.value === 'string') return { ok: true, data: { value: raw.value } };
  }
  return { ok: false, error: 'expected { value: string }' };
};

function providerResponse(text: string, status = 200): Response {
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const input = { systemInstruction: 'sys', userText: 'user', parse: parseEcho };
const deps = (fetchImpl: typeof fetch) => ({ apiKey: 'test-key-not-real', fetchImpl });

beforeEach(() => {
  resetModelCallCount();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('buildRequest — N9, N8', () => {
  it('sends the key in the x-goog-api-key header', () => {
    const { init } = buildRequest('sys', 'user', 'test-key-not-real', new AbortController().signal);

    const headers = init.headers as Record<string, string>;
    expect(headers['x-goog-api-key']).toBe('test-key-not-real');
  });

  it('never puts the key in the query string', () => {
    const { url } = buildRequest('sys', 'user', 'test-key-not-real', new AbortController().signal);

    expect(url).not.toContain('key=');
    expect(url).not.toContain('test-key-not-real');
  });

  it('pins an explicit model version with no moving alias', () => {
    const { url } = buildRequest('sys', 'user', 'k', new AbortController().signal);

    expect(url).toContain(MODEL_ID);
    expect(MODEL_ID).not.toContain('-' + 'latest');
  });

  it('demands JSON at the API level rather than only in the prompt', () => {
    const { init } = buildRequest('sys', 'user', 'k', new AbortController().signal);

    if (typeof init.body !== 'string') throw new Error('body should be a JSON string');
    const body = JSON.parse(init.body) as { generationConfig: { responseMimeType: string } };
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });
});

describe('callModel — N2', () => {
  it('costs one call when the response is valid', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(providerResponse('{"value":"ok"}')));

    const result = await callModel(input, deps(fetchImpl as unknown as typeof fetch));

    expect(result.ok).toBe(true);
    expect(modelCallCount()).toBe(CALLS_ON_SUCCESS);
  });

  it('costs at most two calls when the retry fires, never three', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(providerResponse('not json at all')));

    const result = await callModel(input, deps(fetchImpl as unknown as typeof fetch));

    expect(result.ok).toBe(false);
    expect(modelCallCount()).toBe(MAX_CALLS_PER_CYCLE);
    expect(fetchImpl).toHaveBeenCalledTimes(MAX_CALLS_PER_CYCLE);
  });
});

describe('callModel — N5', () => {
  it('retries exactly once and succeeds on the second attempt', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(providerResponse('garbage'))
      .mockResolvedValueOnce(providerResponse('{"value":"recovered"}'));

    const result = await callModel(input, deps(fetchImpl as unknown as typeof fetch));

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected success');
    expect(result.data.value).toBe('recovered');
    expect(modelCallCount()).toBe(2);
  });

  it('fails visibly after the second malformed response, inventing nothing', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(providerResponse('garbage')));

    const result = await callModel(input, deps(fetchImpl as unknown as typeof fetch));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.kind).toBe('malformed');
  });

  it('treats a schema-valid-but-wrong response as malformed', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(providerResponse('{"other":"shape"}')));

    const result = await callModel(input, deps(fetchImpl as unknown as typeof fetch));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.kind).toBe('malformed');
  });

  it('strips one fence, and does not dig JSON out of prose', async () => {
    const fenced = vi.fn(() => Promise.resolve(providerResponse('```json\n{"value":"fenced"}\n```')));
    const fencedResult = await callModel(input, deps(fenced as unknown as typeof fetch));
    expect(fencedResult.ok).toBe(true);

    resetModelCallCount();
    const prose = vi.fn(() =>
      Promise.resolve(providerResponse('Sure! Here you go:\n{"value":"x"}\nHope that helps.')),
    );
    const proseResult = await callModel(input, deps(prose as unknown as typeof fetch));
    expect(proseResult.ok).toBe(false);
  });

  it('treats an empty response as malformed, then retries and can still succeed', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(providerResponse(''))
      .mockResolvedValueOnce(providerResponse('{"value":"recovered"}'));

    const result = await callModel(input, deps(fetchImpl as unknown as typeof fetch));

    expect(result.ok).toBe(true);
    expect(modelCallCount()).toBe(2);
  });

  it('fails visibly when every attempt returns an empty response', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(providerResponse('')));

    const result = await callModel(input, deps(fetchImpl as unknown as typeof fetch));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.kind).toBe('malformed');
  });

  it('does not retry a refused request — repeating it cannot succeed', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(new Response('nope', { status: 400 })));

    const result = await callModel(input, deps(fetchImpl as unknown as typeof fetch));

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toEqual({ kind: 'refused', status: 400 });
    expect(modelCallCount()).toBe(1);
  });
});

describe('callModel — N6', () => {
  it('bounds a hanging request and surfaces a typed timeout', async () => {
    vi.useFakeTimers();

    // Never resolves on its own; only the abort signal ends it.
    const fetchImpl = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new Error('aborted'));
          });
        }),
    );

    const pending = callModel(input, deps(fetchImpl as unknown as typeof fetch));
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 1);
    const result = await pending;

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.kind).toBe('timeout');
  });
});

describe('readServerEnv — N1', () => {
  it('returns the key when it is present server-side', () => {
    const result = readServerEnv({ GEMINI_API_KEY: 'server-side-key' });

    expect(result).toEqual({ ok: true, data: { apiKey: 'server-side-key' } });
  });

  it('rejects a VITE_-prefixed key, which Vite would inline into the bundle', () => {
    const result = readServerEnv({ VITE_GEMINI_API_KEY: 'leaked-key' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toContain('VITE_GEMINI_API_KEY');
    expect(result.error).toContain('client bundle');
  });

  it('never echoes the secret value back in the error', () => {
    const result = readServerEnv({ VITE_GEMINI_API_KEY: 'leaked-value-here' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).not.toContain('leaked-value-here');
  });

  it('rejects the prefixed key even when the correct one is also set', () => {
    expect(
      readServerEnv({ GEMINI_API_KEY: 'ok-key', VITE_GEMINI_API_KEY: 'leaked-key' }).ok,
    ).toBe(false);
  });

  it('names the missing variable when nothing is set', () => {
    const result = readServerEnv({});

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toContain('GEMINI_API_KEY');
  });
});
