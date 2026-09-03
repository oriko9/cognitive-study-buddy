/**
 * Shared types and bound constants for both model calls.
 *
 * This is the only place in the codebase where a figure from the Definition of
 * Done appears as a literal. Every constant names the criterion that owns it;
 * every other module imports from here rather than restating the number. L8,
 * amended, and L12: a figure written twice drifts, and prose cannot stop it.
 *
 * Figures marked "owned here" are set by specs/specification.md and belong to
 * no criterion — a future criterion should cite them rather than copy them.
 */

export type Result<T, E = string> = { ok: true; data: T } | { ok: false; error: E };

// --- D2: the deck the student selects -------------------------------------
export const MAX_PAGES = 30;
export const MAX_BYTES = 10 * 1024 * 1024;

// --- D3: topic extraction --------------------------------------------------
export const MIN_TOPICS = 5;
export const MAX_TOPICS = 15;

// --- D6: the graded verdict ------------------------------------------------
export const SCORE_MIN = 0;
export const SCORE_MAX = 1;

// --- N2: the per-cycle model-call budget -----------------------------------
/** Calls a cycle may cost when nothing goes wrong. */
export const CALLS_ON_SUCCESS = 1;
/** Ceiling including the single retry N5 permits. Never three. */
export const MAX_CALLS_PER_CYCLE = 2;

// --- N5: retry exactly once, then fail visibly -----------------------------
/** One initial attempt plus one retry. */
export const MAX_ATTEMPTS = 2;

// --- N11: the client-side rate limit ---------------------------------------
export const CYCLE_LIMIT = 10;
export const CYCLE_WINDOW_MS = 24 * 60 * 60 * 1000;

// --- Owned here (specs/specification.md §3) --------------------------------
export const MAX_CORPUS_CHARS = 200_000;
export const MAX_TITLE_CHARS = 120;
export const MAX_PROMPT_CHARS = 500;
export const MAX_ANSWER_CHARS = 4_000;
export const MAX_JUSTIFICATION_CHARS = 300;
export const REQUEST_TIMEOUT_MS = 20_000;
export const TOTAL_BUDGET_MS = 45_000;
export const STORAGE_KEY = 'csb.cycles.v1';
export const STORAGE_VERSION = 1;
/** Ceiling on stored timestamps, so a hand-written array cannot grow without bound. */
export const MAX_STORED_TIMESTAMPS = 1_000;

export const TOPIC_ID_PATTERN = /^t[0-9]+$/;

// --- Shapes ----------------------------------------------------------------

export type Topic = {
  id: string;
  title: string;
  page: number;
};

export type Question = {
  topicId: string;
  prompt: string;
};

/** Call 1 response, after deterministic validation. */
export type GenerateResult = {
  topics: Topic[];
  question: Question;
};

/** Call 1 request. `pageCount` is carried because the validator bounds
 *  `topics[].page` by it and the endpoint has no other way to know it. */
export type GenerateRequest = {
  text: string;
  pageCount: number;
};

/** Call 2 request. `answer` may be empty — an empty answer is graded, not refused. */
export type EvaluateRequest = {
  question: string;
  topicId: string;
  answer: string;
};

/** Call 2 response, after deterministic validation. */
export type EvaluateResult = {
  score: number;
  topicId: string;
  justification: string;
};

/** Why a model call did not produce usable data. Every kind renders as a
 *  distinct named state — failure must look like failure (CLAUDE.md §3). */
export type ModelFailure =
  | { kind: 'timeout' }
  | { kind: 'malformed'; detail: string }
  | { kind: 'transport'; status: number }
  | { kind: 'refused'; status: number };

export type ModelResult<T> = { ok: true; data: T } | { ok: false; error: ModelFailure };

/** Extracted corpus, before it becomes a request. */
export type ExtractedDeck = {
  text: string;
  pageCount: number;
};

/** Why a deck could not be turned into a corpus. Each is a named state. */
export type ExtractionFailure =
  | { kind: 'too-many-pages'; pageCount: number }
  | { kind: 'too-large'; bytes: number }
  | { kind: 'no-text-layer' }
  | { kind: 'unreadable'; detail: string };
