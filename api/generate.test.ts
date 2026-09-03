// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from './generate';
import { MAX_PAGES } from '../src/lib/contracts';

type Captured = { status: number; body: unknown };

function res(): VercelResponse & { captured: Captured } {
  const captured: Captured = { status: 0, body: undefined };
  const response = {
    captured,
    status(code: number) {
      captured.status = code;
      return this as unknown as VercelResponse;
    },
    json(payload: unknown) {
      captured.body = payload;
      return this as unknown as VercelResponse;
    },
  };
  return response as unknown as VercelResponse & { captured: Captured };
}

function req(body: unknown, method = 'POST'): VercelRequest {
  return { method, body } as unknown as VercelRequest;
}

const ORIGINAL_KEY = process.env['GEMINI_API_KEY'];

beforeEach(() => {
  process.env['GEMINI_API_KEY'] = 'server-side-key-for-tests';
});

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env['GEMINI_API_KEY'];
  else process.env['GEMINI_API_KEY'] = ORIGINAL_KEY;
  vi.restoreAllMocks();
});

describe('POST /api/generate — request validation happens before any model call', () => {
  it('refuses a non-POST method', async () => {
    const response = res();

    await handler(req({}, 'GET'), response);

    expect(response.captured.status).toBe(405);
  });

  it('refuses an empty corpus rather than spending a call on it', async () => {
    const response = res();

    await handler(req({ text: '   ', pageCount: 2 }), response);

    expect(response.captured.status).toBe(400);
    expect(response.captured.body).toMatchObject({ error: { kind: 'bad-request' } });
  });

  it('refuses a missing pageCount, which the response validator needs', async () => {
    const response = res();

    await handler(req({ text: 'some corpus' }), response);

    expect(response.captured.status).toBe(400);
  });

  it('accepts pageCount at D2 limit and refuses one past it', async () => {
    const atLimit = res();
    // A model call would follow, so stub fetch to fail fast rather than reach out.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('no', { status: 400 }));

    await handler(req({ text: 'corpus', pageCount: MAX_PAGES }), atLimit);
    expect(atLimit.captured.status).not.toBe(400);

    const overLimit = res();
    await handler(req({ text: 'corpus', pageCount: MAX_PAGES + 1 }), overLimit);
    expect(overLimit.captured.status).toBe(400);
  });

  it('reports a misconfigured server without leaking why', async () => {
    delete process.env['GEMINI_API_KEY'];
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = res();

    await handler(req({ text: 'corpus', pageCount: 1 }), response);

    expect(response.captured.status).toBe(500);
    expect(response.captured.body).toEqual({ ok: false, error: { kind: 'server-misconfigured' } });
    // The operator sees the reason; the client does not.
    expect(errors).toHaveBeenCalled();
  });
});
