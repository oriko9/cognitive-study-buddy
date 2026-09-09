import { useState } from 'react';
import { MAX_ANSWER_CHARS, type GenerateResult } from '../lib/contracts.js';

/** D4: one open question, and the topics it was drawn from. */
export function QuestionCard({
  generated,
  busy,
  onSubmit,
}: {
  generated: GenerateResult;
  busy: boolean;
  onSubmit: (answer: string) => void;
}) {
  const [answer, setAnswer] = useState('');
  const topic = generated.topics.find((entry) => entry.id === generated.question.topicId);

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-5">
      <p className="text-xs uppercase tracking-wide text-indigo-300">
        {topic === undefined ? 'Question' : `${topic.title} — page ${String(topic.page)}`}
      </p>
      <h2 data-testid="question-prompt" className="mt-2 text-lg font-semibold">
        {generated.question.prompt}
      </h2>

      <textarea
        value={answer}
        onChange={(event) => {
          setAnswer(event.target.value);
        }}
        maxLength={MAX_ANSWER_CHARS}
        rows={6}
        data-testid="answer-input"
        placeholder="Answer in your own words."
        className="mt-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
      />

      <button
        type="button"
        disabled={busy}
        data-testid="submit-answer"
        onClick={() => {
          onSubmit(answer);
        }}
        className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {busy ? 'Grading…' : 'Submit answer'}
      </button>

      <details className="mt-5 text-sm text-slate-400">
        <summary className="cursor-pointer">Topics found in this deck</summary>
        <ul className="mt-2 space-y-1">
          {generated.topics.map((entry) => (
            <li key={entry.id}>
              {entry.title} — page {entry.page}
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
