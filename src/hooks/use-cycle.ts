/**
 * Orchestrates one cycle: extract → call 1 → answer → call 2. Holds no business
 * rules of its own; bounds live in contracts.ts and validation in schema.ts.
 *
 * Storage and clock are injectable so the hook is testable without globals.
 */
import { useCallback, useState } from 'react';
import type {
  EvaluateResult,
  ExtractionFailure,
  GenerateResult,
  ModelFailure,
} from '../lib/contracts.js';
import { extractPdfText } from '../lib/pdf-text.js';
import { hasQuota, recordCycle, remainingCycles, type Clock, type StorageLike } from '../lib/cycle-counter.js';

export type CycleState =
  | { phase: 'idle' }
  | { phase: 'extracting' }
  | { phase: 'generating' }
  | { phase: 'answering'; generated: GenerateResult }
  | { phase: 'evaluating'; generated: GenerateResult }
  | { phase: 'done'; generated: GenerateResult; verdict: EvaluateResult }
  | { phase: 'deck-failed'; failure: ExtractionFailure }
  | { phase: 'model-failed'; failure: ModelFailure }
  | { phase: 'server-misconfigured' }
  | { phase: 'limit-reached' };

type ApiFailure = { ok: false; error: { kind: string; status?: number; detail?: string } };

function isApiFailure(payload: unknown): payload is ApiFailure {
  if (typeof payload !== 'object' || payload === null) return false;
  const body = payload as Record<string, unknown>;
  if (body['ok'] !== false) return false;
  const error = body['error'];
  return typeof error === 'object' && error !== null && 'kind' in error;
}

function toModelFailure(payload: unknown): ModelFailure | 'server-misconfigured' {
  if (!isApiFailure(payload)) return { kind: 'transport', status: 0 };
  const kind = payload.error.kind;
  if (kind === 'server-misconfigured') return 'server-misconfigured';
  if (kind === 'timeout') return { kind: 'timeout' };
  if (kind === 'malformed') return { kind: 'malformed', detail: payload.error.detail ?? '' };
  if (kind === 'refused') return { kind: 'refused', status: payload.error.status ?? 400 };
  return { kind: 'transport', status: payload.error.status ?? 0 };
}

export type CycleDeps = {
  storage: StorageLike;
  clock: Clock;
  fetchImpl?: typeof fetch;
};

export function useCycle(deps: CycleDeps) {
  const [state, setState] = useState<CycleState>({ phase: 'idle' });
  const [remaining, setRemaining] = useState<number>(() =>
    remainingCycles(deps.storage, deps.clock),
  );

  const doFetch = deps.fetchImpl ?? globalThis.fetch.bind(globalThis);

  const reset = useCallback(() => {
    setState({ phase: 'idle' });
  }, []);

  const start = useCallback(
    async (bytes: ArrayBuffer): Promise<void> => {
      if (!hasQuota(deps.storage, deps.clock)) {
        setState({ phase: 'limit-reached' });
        return;
      }

      setState({ phase: 'extracting' });
      const extracted = await extractPdfText(bytes);
      if (!extracted.ok) {
        setState({ phase: 'deck-failed', failure: extracted.error });
        return;
      }

      setState({ phase: 'generating' });
      let payload: unknown;
      try {
        const response = await doFetch('/api/generate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(extracted.data),
        });
        payload = await response.json();
      } catch {
        setState({ phase: 'model-failed', failure: { kind: 'transport', status: 0 } });
        return;
      }

      if (isApiFailure(payload)) {
        const failure = toModelFailure(payload);
        setState(
          failure === 'server-misconfigured'
            ? { phase: 'server-misconfigured' }
            : { phase: 'model-failed', failure },
        );
        return;
      }

      const generated = (payload as { data: GenerateResult }).data;
      setState({ phase: 'answering', generated });
    },
    [deps.storage, deps.clock, doFetch],
  );

  const submit = useCallback(
    async (generated: GenerateResult, answer: string): Promise<void> => {
      setState({ phase: 'evaluating', generated });

      let payload: unknown;
      try {
        const response = await doFetch('/api/evaluate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            question: generated.question.prompt,
            topicId: generated.question.topicId,
            answer,
          }),
        });
        payload = await response.json();
      } catch {
        setState({ phase: 'model-failed', failure: { kind: 'transport', status: 0 } });
        return;
      }

      if (isApiFailure(payload)) {
        const failure = toModelFailure(payload);
        setState(
          failure === 'server-misconfigured'
            ? { phase: 'server-misconfigured' }
            : { phase: 'model-failed', failure },
        );
        return;
      }

      const verdict = (payload as { data: EvaluateResult }).data;
      // A cycle counts once it has completed, not once it has started.
      setRemaining(recordCycle(deps.storage, deps.clock));
      setState({ phase: 'done', generated, verdict });
    },
    [deps.storage, deps.clock, doFetch],
  );

  return { state, remaining, start, submit, reset };
}
