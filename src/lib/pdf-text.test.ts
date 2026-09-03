// @vitest-environment node
//
// DOM-free is a requirement this file opts into, not a property it has:
// vite.config.ts sets jsdom for every test file (specs/specification.md §2).
import { describe, expect, it } from 'vitest';
import { makeDeck } from '../fixtures/make-pdf';
import { extractPdfText } from './pdf-text';
import { MAX_PAGES } from './contracts';

// Not covered here, deliberately: extraction of Hebrew from a real PDF.
// The standard PDF fonts are WinAnsi-encoded and cannot represent Hebrew
// codepoints, so no such fixture can be generated (specs/specification.md §4).
// A regression in pdf-text.ts against right-to-left or non-WinAnsi content
// would not be caught by this file. D9 is checked by hand against a real deck.
describe('extractPdfText', () => {
  it('returns the text and the page count of a readable deck', async () => {
    const deck = await makeDeck({ pages: 2, text: 'Working memory capacity page' });

    const result = await extractPdfText(deck);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected success');
    expect(result.data.pageCount).toBe(2);
    expect(result.data.text).toContain('Working memory capacity page 1');
    expect(result.data.text).toContain('Working memory capacity page 2');
  });

  it('names a deck with no text layer instead of returning an empty string', async () => {
    const deck = await makeDeck({ pages: 3, text: null });

    const result = await extractPdfText(deck);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.kind).toBe('no-text-layer');
  });

  it('accepts a deck at exactly the page limit D2 sets', async () => {
    const deck = await makeDeck({ pages: MAX_PAGES, text: 'Topic' });

    const result = await extractPdfText(deck);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected success');
    expect(result.data.pageCount).toBe(MAX_PAGES);
  });

  it('refuses a deck one page over the limit, naming the count', async () => {
    const deck = await makeDeck({ pages: MAX_PAGES + 1, text: 'Topic' });

    const result = await extractPdfText(deck);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error).toEqual({ kind: 'too-many-pages', pageCount: MAX_PAGES + 1 });
  });

  it('refuses an oversized deck before parsing it', async () => {
    // Not a real PDF: the size gate must reject it without a parser ever seeing it.
    const oversized = new ArrayBuffer(10 * 1024 * 1024 + 1);

    const result = await extractPdfText(oversized);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.kind).toBe('too-large');
  });

  it('names an unreadable file rather than throwing', async () => {
    const notAPdf = new TextEncoder().encode('this is not a pdf at all');

    const result = await extractPdfText(notAPdf.buffer);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected a failure');
    expect(result.error.kind).toBe('unreadable');
  });

});
