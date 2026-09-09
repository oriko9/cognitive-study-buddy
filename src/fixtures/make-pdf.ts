/**
 * Generates fixture PDFs in memory. Nothing binary is committed.
 *
 * specs/specification.md §4: a committed PDF is a binary nobody reviews — a
 * reader cannot tell a two-page deck from one page over the limit, and cannot
 * see the "no text layer" fixture quietly acquiring one. Generated from source,
 * every deck is described at the point of use and every boundary case comes
 * from the same code path.
 */
import { PDFDocument, StandardFonts } from 'pdf-lib';

export type DeckSpec = {
  pages: number;
  /** Text drawn on every page. `null` produces pages with no text layer at all. */
  text: string | null;
};

export async function makeDeck({ pages, text }: DeckSpec): Promise<ArrayBuffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (let n = 1; n <= pages; n += 1) {
    const page = doc.addPage([300, 400]);
    if (text !== null) {
      page.drawText(`${text} ${String(n)}`, { x: 20, y: 350, size: 12, font });
    }
  }

  const bytes = await doc.save();
  // Copy into a plain ArrayBuffer so the fixture matches what a File read gives.
  const out = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(out).set(bytes);
  return out;
}
