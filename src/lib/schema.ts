/**
 * Deterministic validation of both model responses. Never asks a model to check
 * a model (CLAUDE.md §4.3), never imports the adapter.
 *
 * Bounds come from contracts.ts, which cites the criterion that owns each one.
 * A response that fails here is malformed, and the retry N5 permits applies —
 * the caller decides that, not this module.
 */
import {
  MAX_JUSTIFICATION_CHARS,
  MAX_PROMPT_CHARS,
  MAX_TITLE_CHARS,
  MAX_TOPICS,
  MIN_TOPICS,
  SCORE_MAX,
  SCORE_MIN,
  TOPIC_ID_PATTERN,
  type EvaluateResult,
  type GenerateResult,
  type Result,
  type Topic,
} from './contracts';

/**
 * The one normalisation permitted by specs/specification.md §3.4: strip a single
 * wrapping markdown fence. It removes a wrapper without altering, completing or
 * inventing content, which is why it is not a repair.
 *
 * There is deliberately no attempt to find JSON inside arbitrary prose. That is
 * guessing which object the model meant, and a guess that works four times in
 * five is worse than a visible failure because it teaches the reader to trust it.
 */
export function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) return trimmed;

  const firstNewline = trimmed.indexOf('\n');
  if (firstNewline === -1) return trimmed;

  const withoutOpen = trimmed.slice(firstNewline + 1);
  const closing = withoutOpen.lastIndexOf('```');
  if (closing === -1) return trimmed;

  return withoutOpen.slice(0, closing).trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail<T>(error: string): Result<T> {
  return { ok: false, error };
}

function readString(
  source: Record<string, unknown>,
  key: string,
  maxChars: number,
): Result<string> {
  const raw = source[key];
  if (typeof raw !== 'string') return fail(`${key} must be a string`);
  const value = raw.trim();
  if (value === '') return fail(`${key} must not be empty`);
  if (value.length > maxChars) return fail(`${key} exceeds ${String(maxChars)} characters`);
  return { ok: true, data: value };
}

function readTopic(value: unknown, index: number, pageCount: number): Result<Topic> {
  if (!isRecord(value)) return fail(`topics[${String(index)}] must be an object`);

  const id = value['id'];
  if (typeof id !== 'string' || !TOPIC_ID_PATTERN.test(id)) {
    return fail(`topics[${String(index)}].id must match ${String(TOPIC_ID_PATTERN)}`);
  }

  const title = readString(value, 'title', MAX_TITLE_CHARS);
  if (!title.ok) return fail(`topics[${String(index)}].${title.error}`);

  const page = value['page'];
  if (typeof page !== 'number' || !Number.isInteger(page)) {
    return fail(`topics[${String(index)}].page must be an integer`);
  }
  if (page < 1 || page > pageCount) {
    // A page outside the deck is the model citing a source that does not exist.
    return fail(
      `topics[${String(index)}].page ${String(page)} is outside the deck (1..${String(pageCount)})`,
    );
  }

  return { ok: true, data: { id, title: title.data, page } };
}

/** Call 1. `pageCount` comes from the request, because the text alone cannot carry it. */
export function parseGenerateResponse(raw: unknown, pageCount: number): Result<GenerateResult> {
  if (!isRecord(raw)) return fail('response must be a JSON object');

  const rawTopics = raw['topics'];
  if (!Array.isArray(rawTopics)) return fail('topics must be an array');
  if (rawTopics.length < MIN_TOPICS || rawTopics.length > MAX_TOPICS) {
    return fail(
      `topics must contain between ${String(MIN_TOPICS)} and ${String(MAX_TOPICS)} entries, got ${String(rawTopics.length)}`,
    );
  }

  const topics: Topic[] = [];
  const seen = new Set<string>();
  for (const [index, entry] of rawTopics.entries()) {
    const topic = readTopic(entry, index, pageCount);
    if (!topic.ok) return fail(topic.error);
    if (seen.has(topic.data.id)) return fail(`duplicate topic id ${topic.data.id}`);
    seen.add(topic.data.id);
    topics.push(topic.data);
  }

  const rawQuestion = raw['question'];
  // A singular field, not an array: the shape itself carries D4's count.
  if (!isRecord(rawQuestion)) return fail('question must be a single object');

  const topicId = rawQuestion['topicId'];
  if (typeof topicId !== 'string') return fail('question.topicId must be a string');

  const prompt = readString(rawQuestion, 'prompt', MAX_PROMPT_CHARS);
  if (!prompt.ok) return fail(`question.${prompt.error}`);

  // The cross-field invariant. A model that invents a topic id produces a
  // structurally valid object that is semantically wrong.
  if (!seen.has(topicId)) {
    return fail(`question.topicId ${topicId} is not one of the extracted topics`);
  }

  return { ok: true, data: { topics, question: { topicId, prompt: prompt.data } } };
}

/** Call 2. `expectedTopicId` is compared server-side; the model is never trusted to echo it. */
export function parseEvaluateResponse(
  raw: unknown,
  expectedTopicId: string,
): Result<EvaluateResult> {
  if (!isRecord(raw)) return fail('response must be a JSON object');

  const score = raw['score'];
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return fail('score must be a finite number');
  }
  if (score < SCORE_MIN || score > SCORE_MAX) {
    return fail(
      `score ${String(score)} is outside ${String(SCORE_MIN)}..${String(SCORE_MAX)}`,
    );
  }

  const topicId = raw['topicId'];
  if (typeof topicId !== 'string') return fail('topicId must be a string');
  if (topicId !== expectedTopicId) {
    return fail(`topicId ${topicId} does not match the question's topic ${expectedTopicId}`);
  }

  const justification = readString(raw, 'justification', MAX_JUSTIFICATION_CHARS);
  if (!justification.ok) return fail(justification.error);

  return { ok: true, data: { score, topicId, justification: justification.data } };
}
