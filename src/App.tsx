/**
 * Shell only. No feature from specs/framing.md is implemented here yet.
 *
 * The styled block below exists to prove the Tailwind v4 pipeline actually
 * compiles utilities into the bundle — a config file proves nothing.
 */
export function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-8">
      <div
        data-testid="tailwind-probe"
        className="max-w-md rounded-xl border border-indigo-400/40 bg-indigo-600 px-6 py-5 shadow-lg"
      >
        <h1 className="text-2xl font-semibold tracking-tight">Cognitive Study Buddy</h1>
        <p className="mt-2 text-sm text-indigo-100">
          Scaffold only — upload, topic extraction, quiz and weakness map are Turn 1 work.
        </p>
      </div>
    </main>
  );
}
