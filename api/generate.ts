/**
 * Call 1: extracted text in, topics plus one open question out.
 * The model is reached only through the single adapter (CLAUDE.md §4.1, §4.2).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MAX_CORPUS_CHARS, MAX_PAGES } from '../src/lib/contracts.js';
import { parseGenerateResponse } from '../src/lib/schema.js';
import { callModel, resetModelCallCount } from './_lib/call-model.js';
import { readServerEnv } from './_lib/env.js';
import { generateSystemInstruction } from './_lib/prompts.js';

type Body = { text: string; pageCount: number };

function readBody(raw: unknown): { ok: true; data: Body } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'body must be an object' };
  const body = raw as Record<string, unknown>;

  const text = body['text'];
  if (typeof text !== 'string' || text.trim() === '') {
    return { ok: false, error: 'text must be a non-empty string' };
  }
  if (text.length > MAX_CORPUS_CHARS) {
    return { ok: false, error: 'text exceeds the corpus limit' };
  }

  const pageCount = body['pageCount'];
  if (typeof pageCount !== 'number' || !Number.isInteger(pageCount)) {
    return { ok: false, error: 'pageCount must be an integer' };
  }
  if (pageCount < 1 || pageCount > MAX_PAGES) {
    return { ok: false, error: 'pageCount is outside the limit D2 sets' };
  }

  return { ok: true, data: { text: text.trim(), pageCount } };
}

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
): Promise<void> {
  if (request.method !== 'POST') {
    response.status(405).json({ ok: false, error: { kind: 'method-not-allowed' } });
    return;
  }

  const env = readServerEnv(process.env);
  if (!env.ok) {
    // Never leaks the reason to the client; the operator sees it in the logs.
    console.error(env.error);
    response.status(500).json({ ok: false, error: { kind: 'server-misconfigured' } });
    return;
  }

  const body = readBody(request.body);
  if (!body.ok) {
    response.status(400).json({ ok: false, error: { kind: 'bad-request', detail: body.error } });
    return;
  }

  resetModelCallCount();
  const result = await callModel(
    {
      systemInstruction: generateSystemInstruction(body.data.pageCount),
      userText: body.data.text,
      parse: (raw) => parseGenerateResponse(raw, body.data.pageCount),
    },
    { apiKey: env.data.apiKey },
  );

  if (!result.ok) {
    response.status(502).json({ ok: false, error: result.error });
    return;
  }

  response.status(200).json({ ok: true, data: result.data });
}
