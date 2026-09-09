import { MAX_PAGES } from '../lib/contracts.js';

/** D8: one click to select a deck. Nothing is uploaded — the file is read here. */
export function DeckPicker({
  onSelect,
  disabled,
}: {
  onSelect: (bytes: ArrayBuffer) => void;
  disabled: boolean;
}) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-5">
      <h2 className="text-lg font-semibold">Select a lecture deck</h2>
      <p className="mt-2 text-sm text-slate-400">
        A PDF of up to {MAX_PAGES} pages with real text in it, not a scan. It is read in this
        browser and never uploaded anywhere.
      </p>
      <label className="mt-4 inline-block">
        <span className="sr-only">Choose a PDF</span>
        <input
          type="file"
          accept="application/pdf"
          disabled={disabled}
          data-testid="deck-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file === undefined) return;
            void file.arrayBuffer().then(onSelect);
          }}
          className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-indigo-500"
        />
      </label>
    </section>
  );
}
