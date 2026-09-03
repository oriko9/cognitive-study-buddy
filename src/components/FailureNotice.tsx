import type { FailureMessage } from '../lib/failure-messages';

/**
 * A failure the student can read: what failed, and what to do next. Never a
 * blank screen, never a spinner that never ends, never a plausible substitute.
 */
export function FailureNotice({
  message,
  onRetry,
}: {
  message: FailureMessage;
  onRetry?: () => void;
}) {
  return (
    <section
      role="alert"
      data-testid="failure-notice"
      className="rounded-xl border border-amber-400/40 bg-amber-950/40 px-6 py-5"
    >
      <h2 className="text-lg font-semibold text-amber-100">{message.title}</h2>
      <p className="mt-2 text-sm text-amber-200/90">{message.next}</p>
      {onRetry !== undefined && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-amber-400 px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-300"
        >
          Start again
        </button>
      )}
    </section>
  );
}
