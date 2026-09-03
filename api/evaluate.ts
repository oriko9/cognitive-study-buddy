/**
 * Call 2: question, topic and the student's answer in; score, topic and a
 * one-sentence justification out. Reached only through the single adapter.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MAX_ANSWER_CHARS, MAX_PROMPT_CHARS, TOPIC_ID_PATTERN } from '../src/lib/contracts';
import { parseEvaluateResponse } from '../src/lib/schema';
import { callModel, resetModelCallCount } from './_lib/call-model';
import { readServerEnv } from './_lib/env';
import { evaluateSystemInstruction } from './_lib/prompts';

type Body = { question: string; topicId: string; answer: string };

function readBody(raw: unknown): { ok: true; data: Body } | { ok: false; error: string } {
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'body must be an object' };
  const body = raw as Record<string, unknown>;

  const question = body['question'];
  if (typeof question !== 'string' || question.trim() === '') {
    return { ok: false, error: 'question must be a non-empty string' };
  }
  if (question.length > MAX_PROMPT_CHARS) {
    return { ok: false, error: 'question exceeds the prompt limit' };
  }

  const topicId = body['topicId'];
  if (typeof topicId !== 'string' || !TOPIC_ID_PATTERN.test(topicId)) {
    return { ok: false, error: 'topicId is malformed' };
  }

  // An empty answer is a real case and is graded, not refused.
  const answer = body['answer'];
  if (typeof answer !== 'string') return { ok: false, error: 'answer must be a string' };
  if (answer.length > MAX_ANSWER_CHARS) {
    return { ok: false, error: 'answer exceeds the answer limit' };
  }

  return { ok: true, data: { question: question.trim(), topicId, answer } };
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
    console.error(env.error);
    response.status(500).json({ ok: false, error: { kind: 'server-misconfigured' } });
    return;
  }

  const body = readBody(request.body);
  if (!body.ok) {
    response.status(400).json({ ok: false, error: { kind: 'bad-request', detail: body.error } });
    return;
  }

  const userText = [
    `Question: ${body.data.question}`,
    `Topic id: ${body.data.topicId}`,
    `Student answer: ${body.data.answer}`,
  ].join('\n');

  resetModelCallCount();
  const result = await callModel(
    {
      systemInstruction: evaluateSystemInstruction(),
      userText,
      // The model is never trusted to echo the topic id back correctly.
      parse: (raw) => parseEvaluateResponse(raw, body.data.topicId),
    },
    { apiKey: env.data.apiKey },
  );

  if (!result.ok) {
    response.status(502).json({ ok: false, error: result.error });
    return;
  }

  response.status(200).json({ ok: true, data: result.data });
}
