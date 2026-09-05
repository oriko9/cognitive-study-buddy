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
 *
 * DO NOT DELETE the GlobalWorkerOptions.workerSrc line below — it looks like
 * dead configuration and is not. pdfjs-dist auto-configures its own worker only
 * when it detects Node (checking `typeof process`), which is also true inside
 * Vitest's jsdom environment — jsdom emulates window and document, not
 * process — so every test in this repository runs under that Node
 * auto-configuration regardless of which vitest environment a file selects. In
 * a real browser nothing sets it automatically, both the real-worker path and
 * pdfjs's own fake-worker fallback need it, and without it every extraction
 * fails with "Setting up fake worker failed: \"No `GlobalWorkerOptions.workerSrc`
 * specified.\"". This was found against a live deploy, not by any offline test
 * — see specs/spiral-log.md, Turn 1, 2026-09-03.
 *
 * The assignment below is `||=`, not `=`, and that is load-bearing, not a
 * style choice. pdfjs's own module-load static initializer already sets
 * GlobalWorkerOptions.workerSrc to a value ("./pdf.worker.mjs") that correctly
 * resolves under Node, via a dynamic import() evaluated relative to pdf.mjs's
 * own location — but only when isNodeJS is true. `new URL(..., import.meta.url)`
 * resolves relative to *this* file, not pdf.mjs's, so an unconditional `=`
 * here overwrites that already-correct Node value with a broken one and fails
 * every test. `||=` only supplies this value when pdfjs left workerSrc at its
 * default empty string — i.e. only in the browser, where nothing else sets it.
 * `new URL(..., import.meta.url)` is Vite's documented pattern for bundling a
 * referenced asset: under `vite build` it statically rewrites this expression
 * to a hashed dist/assets/ URL. Confirmed by inspecting the built output
 * (dist/assets/pdf.worker-*.mjs present, referenced from the main bundle);
 * NOT confirmed by running in an actual browser — no browser is available in
 * this environment.
 */
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  MAX_BYTES,
  MAX_PAGES,
  type ExtractedDeck,
  type ExtractionFailure,
  type Result,
} from './contracts';

pdfjs.GlobalWorkerOptions.workerSrc ||= new URL(
  'pdfjs-dist/legacy/build/pdf.worker.mjs',
  import.meta.url,
).toString();

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
