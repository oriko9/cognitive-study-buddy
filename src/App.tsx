import { DeckPicker } from './components/DeckPicker.js';
import { FailureNotice } from './components/FailureNotice.js';
import { QuestionCard } from './components/QuestionCard.js';
import { VerdictCard } from './components/VerdictCard.js';
import { useCycle, type CycleDeps } from './hooks/use-cycle.js';
import {
  extractionMessage,
  limitMessage,
  modelMessage,
  serverMisconfiguredMessage,
} from './lib/failure-messages.js';

/** Storage and clock are injectable so tests need no browser globals. */
function browserDeps(): CycleDeps {
  return { storage: window.localStorage, clock: Date.now };
}

function Working({ label }: { label: string }) {
  return (
    <section
      role="status"
      data-testid="working"
      className="rounded-xl border border-slate-700 bg-slate-900/60 px-6 py-5 text-sm text-slate-300"
    >
      {label}
    </section>
  );
}

export function App({ deps }: { deps?: CycleDeps }) {
  const { state, remaining, start, submit, reset } = useCycle(deps ?? browserDeps());

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Cognitive Study Buddy</h1>
          <p className="mt-1 text-sm text-slate-400">
            Turn a deck into one question you cannot answer from recognition. Cycles left today in
            this browser: <span data-testid="remaining">{remaining}</span>.
          </p>
        </header>

        {state.phase === 'idle' && (
          <DeckPicker onSelect={(bytes) => void start(bytes)} disabled={false} />
        )}
        {state.phase === 'extracting' && <Working label="Reading the deck…" />}
        {state.phase === 'generating' && <Working label="Finding topics and writing a question…" />}

        {(state.phase === 'answering' || state.phase === 'evaluating') && (
          <QuestionCard
            generated={state.generated}
            busy={state.phase === 'evaluating'}
            onSubmit={(answer) => void submit(state.generated, answer)}
          />
        )}

        {state.phase === 'done' && (
          <VerdictCard generated={state.generated} verdict={state.verdict} onAgain={reset} />
        )}

        {state.phase === 'deck-failed' && (
          <FailureNotice message={extractionMessage(state.failure)} onRetry={reset} />
        )}
        {state.phase === 'model-failed' && (
          <FailureNotice message={modelMessage(state.failure)} onRetry={reset} />
        )}
        {state.phase === 'server-misconfigured' && (
          <FailureNotice message={serverMisconfiguredMessage()} />
        )}
        {state.phase === 'limit-reached' && <FailureNotice message={limitMessage()} />}
      </div>
    </main>
  );
}
