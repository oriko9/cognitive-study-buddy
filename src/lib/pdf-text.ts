/**
 * D2: the student selects a PDF and its text is extracted in the browser.
 * Nothing is uploaded, transmitted to storage, or persisted anywhere.
 *
 * D2's two limits are knowable at different moments, so they are enforced in
 * two stages (specs/specification.md §3.1):
 *   - byte size, before parsing, because length needs no parser;
 *   - page count, after opening the document and before extracting any text,
 *     because the count cannot be known until the document is parsed.
 *
 * A deck with no text layer is a named failure, never an empty string. An empty
 * corpus sent to the model spends budget to receive nonsense, and a blank
 * result would look to the student like a system that worked and found nothing.
 */
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  MAX_BYTES,
  MAX_PAGES,
  type ExtractedDeck,
  type ExtractionFailure,
  type Result,
} from './contracts';

export async function extractPdfText(
  bytes: ArrayBuffer,
): Promise<Result<ExtractedDeck, ExtractionFailure>> {
  // Stage one: size, before any parsing.
  if (bytes.byteLength > MAX_BYTES) {
    return { ok: false, error: { kind: 'too-large', bytes: bytes.byteLength } };
  }

  let doc: Awaited<ReturnType<typeof pdfjs.getDocument>['promise']>;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(bytes),
      isEvalSupported: false,
      useSystemFonts: false,
    }).promise;
  } catch (cause) {
    return {
      ok: false,
      error: { kind: 'unreadable', detail: cause instanceof Error ? cause.message : 'unknown' },
    };
  }

  try {
    // Stage two: page count, after opening and before extracting any text.
    const pageCount = doc.numPages;
    if (pageCount > MAX_PAGES) {
      return { ok: false, error: { kind: 'too-many-pages', pageCount } };
    }

    const parts: string[] = [];
    for (let n = 1; n <= pageCount; n += 1) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      // 'str' in item narrows pdfjs's TextItem | TextMarkedContent union to the
      // member that carries text. No cast, no any.
      const line = content.items
        .map((item) => ('str' in item && typeof item.str === 'string' ? item.str : ''))
        .filter((str) => str !== '')
        .join(' ')
        .trim();
      if (line !== '') parts.push(line);
    }

    const text = parts.join('\n').trim();
    if (text === '') {
      return { ok: false, error: { kind: 'no-text-layer' } };
    }

    return { ok: true, data: { text, pageCount } };
  } catch (cause) {
    return {
      ok: false,
      error: { kind: 'unreadable', detail: cause instanceof Error ? cause.message : 'unknown' },
    };
  } finally {
    await doc.destroy();
  }
}
