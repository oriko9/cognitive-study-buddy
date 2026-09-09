/**
 * Every failure the student can meet, as a named state saying what failed and
 * what to do next (CLAUDE.md §3).
 *
 * The switches are exhaustive over their unions, so adding a failure kind
 * without a message is a typecheck error rather than a blank screen. Failure
 * must look like failure — never a spinner that never ends, never a default
 * verdict. (Norman's Gulf of Evaluation; Lufthansa 2904.)
 */
import { CYCLE_LIMIT, MAX_PAGES, type ExtractionFailure, type ModelFailure } from './contracts.js';

export type FailureMessage = {
  /** What failed, in the student's terms. */
  title: string;
  /** What to do next. Never empty — a dead end is not an error message. */
  next: string;
};

export function extractionMessage(failure: ExtractionFailure): FailureMessage {
  switch (failure.kind) {
    case 'too-large':
      return {
        title: 'That file is too large to read in the browser.',
        next: 'Try a smaller PDF, or split the deck and upload one part.',
      };
    case 'too-many-pages':
      return {
        title: `That deck has ${String(failure.pageCount)} pages, and the limit is ${String(MAX_PAGES)}.`,
        next: `Split it and select up to ${String(MAX_PAGES)} pages.`,
      };
    case 'no-text-layer':
      return {
        title: 'This PDF has no text in it — it is probably scanned images.',
        next: 'Use a PDF exported from the slides rather than a scan or a photograph.',
      };
    case 'unreadable':
      return {
        title: 'That file could not be opened as a PDF.',
        next: 'Check it opens in a PDF viewer, then select it again.',
      };
  }
}

export function modelMessage(failure: ModelFailure): FailureMessage {
  switch (failure.kind) {
    case 'timeout':
      return {
        title: 'The model did not answer in time.',
        next: 'Try again. If it keeps timing out, try a shorter deck.',
      };
    case 'malformed':
      return {
        title: 'The model returned something this app could not read, twice.',
        next: 'Try again. Nothing was invented to fill the gap.',
      };
    case 'refused':
      return {
        title: 'The model provider refused the request.',
        next: 'This usually means the daily free-tier quota is spent. Try again tomorrow.',
      };
    case 'transport':
      return {
        title: 'The model could not be reached.',
        next: 'Check your connection and try again.',
      };
  }
}

export function limitMessage(): FailureMessage {
  return {
    title: 'Daily limit reached.',
    next: `This browser has run ${String(CYCLE_LIMIT)} cycles in the last 24 hours. Try again later.`,
  };
}

export function serverMisconfiguredMessage(): FailureMessage {
  return {
    title: 'This deployment is not configured correctly.',
    next: 'Nothing you can do from here — the operator needs to set the server key.',
  };
}
