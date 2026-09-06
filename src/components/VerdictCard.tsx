import type { EvaluateResult, GenerateResult } from '../lib/contracts.js';

/**
 * D6: the score and the one-sentence justification, shown to the student.
 * The reason is displayed, never merely stored — a verdict without a reason is
 * the opaque failure CLAUDE.md §3 forbids.
 */
export function VerdictCard({
  generated,
  verdict,
  onAgain,
}: {
  generated: GenerateResult;
  verdict: EvaluateResult;
  onAgain: () => void;
}) {
  const topic = generated.topics.find((entry) => entry.id === verdict.topicId);
  const percent = Math.round(verdict.score * 100);

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-5">
      <p className="text-xs uppercase tracking-wide text-indigo-300">
        {topic === undefined ? 'Verdict' : topic.title}
      </p>
      <h2 data-testid="verdict-score" className="mt-2 text-3xl font-semibold">
        {percent}%
      </h2>
      <p data-testid="verdict-justification" className="mt-3 text-sm text-slate-300">
        {verdict.justification}
      </p>
      <button
        type="button"
        onClick={onAgain}
        className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
      >
        Try another deck
      </button>
    </section>
  );
}
