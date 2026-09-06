import { describe, expect, it } from 'vitest';
import {
  extractionMessage,
  limitMessage,
  modelMessage,
  serverMisconfiguredMessage,
} from './failure-messages.js';
import type { ExtractionFailure, ModelFailure } from './contracts.js';

const extractionKinds: ExtractionFailure[] = [
  { kind: 'too-large', bytes: 1 },
  { kind: 'too-many-pages', pageCount: 99 },
  { kind: 'no-text-layer' },
  { kind: 'unreadable', detail: 'x' },
];

const modelKinds: ModelFailure[] = [
  { kind: 'timeout' },
  { kind: 'malformed', detail: 'x' },
  { kind: 'transport', status: 0 },
  { kind: 'refused', status: 429 },
];

describe('failure messages — a dead end is not an error message', () => {
  const all = [
    ...extractionKinds.map((f) => [f.kind, extractionMessage(f)] as const),
    ...modelKinds.map((f) => [f.kind, modelMessage(f)] as const),
    ['limit', limitMessage()] as const,
    ['misconfigured', serverMisconfiguredMessage()] as const,
  ];

  for (const [kind, message] of all) {
    it(`${kind} says what failed and what to do next`, () => {
      expect(message.title.trim()).not.toBe('');
      expect(message.next.trim()).not.toBe('');
    });
  }

  it('gives every failure a distinct title, so two causes never read alike', () => {
    const titles = all.map(([, message]) => message.title);

    expect(new Set(titles).size).toBe(titles.length);
  });

  it('names the offending page count rather than only the limit', () => {
    expect(extractionMessage({ kind: 'too-many-pages', pageCount: 31 }).title).toContain('31');
  });
});
