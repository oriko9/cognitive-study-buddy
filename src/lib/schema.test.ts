import { describe, expect, it } from 'vitest';
import { parseEvaluateResponse, parseGenerateResponse, stripJsonFence } from './schema';
import { MAX_TOPICS, MIN_TOPICS } from './contracts';

import generateOk from '../fixtures/generate-ok.json';
import generateOkHe from '../fixtures/generate-ok-he.json';
import tooFew from '../fixtures/generate-too-few-topics.json';
import tooMany from '../fixtures/generate-too-many-topics.json';
import emptyTitle from '../fixtures/generate-empty-title.json';
import twoQuestions from '../fixtures/generate-two-questions.json';
import noQuestion from '../fixtures/generate-no-question.json';
import unknownTopic from '../fixtures/generate-question-unknown-topic.json';
import pageOutOfRange from '../fixtures/generate-page-out-of-range.json';
import semanticallyEmpty from '../fixtures/semantically-empty.json';
import evaluateOk from '../fixtures/evaluate-ok.json';
import scoreOutOfRange from '../fixtures/evaluate-score-out-of-range.json';
import topicMismatch from '../fixtures/evaluate-topic-mismatch.json';
import emptyJustification from '../fixtures/evaluate-empty-justification.json';

const PAGES = 3;

describe('parseGenerateResponse — D3, D4', () => {
  it('accepts a valid response and returns the parsed topics and question', () => {
    const result = parseGenerateResponse(generateOk, PAGES);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.data.topics).toHaveLength(MIN_TOPICS);
    expect(result.data.question.topicId).toBe('t3');
  });

  it('accepts a Hebrew response unchanged — the D9 path through validation', () => {
    const result = parseGenerateResponse(generateOkHe, PAGES);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.data.topics[2]?.title).toBe('חלוקה ליחידות');
    expect(result.data.question.prompt).toContain('חלוקה ליחידות');
  });

  it('rejects fewer topics than D3 allows, naming the count', () => {
    const result = parseGenerateResponse(tooFew, PAGES);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toContain(String(MIN_TOPICS));
    expect(result.error).toContain(String(MIN_TOPICS - 1));
  });

  it('rejects more topics than D3 allows', () => {
    const result = parseGenerateResponse(tooMany, PAGES);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toContain(String(MAX_TOPICS));
  });

  it('rejects a whitespace-only title, which is schema-valid by shape and useless in fact', () => {
    const result = parseGenerateResponse(emptyTitle, PAGES);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toContain('title');
  });

  it('rejects an array of questions — D4 fixes the count in the shape', () => {
    const result = parseGenerateResponse(twoQuestions, PAGES);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toContain('question must be a single object');
  });

  it('rejects a response with no question at all', () => {
    const result = parseGenerateResponse(noQuestion, PAGES);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toContain('question');
  });

  it('rejects a question whose topicId is not among the topics — the cross-field invariant', () => {
    const result = parseGenerateResponse(unknownTopic, PAGES);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toContain('t99');
    expect(result.error).toContain('not one of the extracted topics');
  });

  it('rejects a page number outside the deck, bounded by the request pageCount', () => {
    const result = parseGenerateResponse(pageOutOfRange, PAGES);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toContain('outside the deck');
  });

  it('accepts a page equal to pageCount and rejects one past it', () => {
    const [first, ...rest] = generateOk.topics;
    if (first === undefined) throw new Error('fixture must contain topics');

    const atLimit = { ...generateOk, topics: [{ ...first, page: PAGES }, ...rest] };
    expect(parseGenerateResponse(atLimit, PAGES).ok).toBe(true);

    const pastLimit = { ...generateOk, topics: [{ ...first, page: PAGES + 1 }, ...rest] };
    expect(parseGenerateResponse(pastLimit, PAGES).ok).toBe(false);
  });

  it('rejects a structurally valid but semantically empty response', () => {
    const result = parseGenerateResponse(semanticallyEmpty, PAGES);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
  });

  it('rejects a non-object', () => {
    expect(parseGenerateResponse('topics', PAGES).ok).toBe(false);
    expect(parseGenerateResponse(null, PAGES).ok).toBe(false);
    expect(parseGenerateResponse([], PAGES).ok).toBe(false);
  });
});

describe('parseEvaluateResponse — D6', () => {
  it('accepts a valid verdict', () => {
    const result = parseEvaluateResponse(evaluateOk, 't3');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error);
    expect(result.data).toEqual({
      score: 0.4,
      topicId: 't3',
      justification: 'The answer names chunking but does not explain why it helps.',
    });
  });

  it('rejects a score outside the range D6 sets', () => {
    const result = parseEvaluateResponse(scoreOutOfRange, 't3');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toContain('outside');
  });

  it('rejects a topicId the model did not echo back correctly', () => {
    const result = parseEvaluateResponse(topicMismatch, 't3');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toContain('does not match');
  });

  it('rejects an empty justification — D6 requires a reason to show the student', () => {
    const result = parseEvaluateResponse(emptyJustification, 't3');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toContain('justification');
  });

  it('rejects NaN and Infinity, which are numbers but not scores', () => {
    expect(parseEvaluateResponse({ score: NaN, topicId: 't3', justification: 'x' }, 't3').ok).toBe(
      false,
    );
    expect(
      parseEvaluateResponse({ score: Infinity, topicId: 't3', justification: 'x' }, 't3').ok,
    ).toBe(false);
  });

  it('accepts both ends of the score range', () => {
    expect(parseEvaluateResponse({ score: 0, topicId: 't3', justification: 'x' }, 't3').ok).toBe(
      true,
    );
    expect(parseEvaluateResponse({ score: 1, topicId: 't3', justification: 'x' }, 't3').ok).toBe(
      true,
    );
  });
});

describe('stripJsonFence', () => {
  it('strips a single wrapping fence', () => {
    const fenced = '```json\n{"a":1}\n```';

    expect(stripJsonFence(fenced)).toBe('{"a":1}');
  });

  it('leaves unfenced JSON untouched', () => {
    expect(stripJsonFence('  {"a":1}  ')).toBe('{"a":1}');
  });

  it('does not extract JSON from surrounding prose — that would be guessing', () => {
    const prose = 'Sure! Here it is:\n\n{"a":1}\n\nLet me know.';

    // Returned unchanged, so JSON.parse fails and the response counts as malformed.
    expect(stripJsonFence(prose)).toBe(prose);
    expect(() => {
      JSON.parse(stripJsonFence(prose));
    }).toThrow();
  });
});
