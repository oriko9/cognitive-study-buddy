# Specification — Cognitive Study Buddy

> Module 10 deliverable. This document answers **how**. `specs/framing.md`
> answers **what** and **why**, and wins on any conflict.
>
> - **Status:** Locked for Spiral Turn 1
> - **Owner:** Ori
> - **Date:** 2026-09-01

**On figures.** No numeric bound from `framing.md` §3 is repeated here. Where a
contract has a bound, this document names the criterion that owns it — D3, D6,
N2, N5, N11 — and the implementation reads it from a single constants module
that cites the same criterion. This is L8 and L12 applied rather than restated:
a number written twice drifts, and the drift is invisible until something
contradicts it. Figures that exist **only** here, because no criterion sets them
— the request timeout, string length ceilings, the storage key — are marked
*owned here* and are the ones a future criterion should cite rather than copy.

---

## 1. Goal and its reason

The system converts a student's own lecture deck into one piece of evidence
about their understanding: a question they cannot answer from recognition, and a
graded verdict with the reason shown. `framing.md` §1 argues why that matters —
a feeling of comprehension is not evidence, and study time allocated by
intuition flows toward material that is already familiar. This document exists
to make that loop buildable without discovering its shape while writing it.

The academic reason is narrower and worth stating plainly. This is coursework
graded on the repository, not the running app, and the specification is where
intent is supposed to become checkable before implementation exists to argue
with. A contract written after the code describes what was built; written
before, it can be wrong in a way the code then proves. Every criterion in
`framing.md` §3 names a verification, and §2 below says which module owns each
one, what its test stubs, and — for the ones with no test today — says so rather
than implying coverage that does not exist.

---

## 2. Testable success criteria

Not a restatement of the Definition of Done. For each surviving criterion: the
module that owns it, what its test stubs, and the fixture it runs against.

**Nothing here is implemented yet.** Only N1, N7 and N8 have tests today, and
none of those three tests a module named below — they are gates over the
repository itself. Every other row is a plan.

| Criterion | Module that owns it | What the test stubs | Fixture |
| --- | --- | --- | --- |
| D2 | `src/lib/pdf-text.ts` | Nothing. Pure function over an `ArrayBuffer`; no network, no DOM. | `src/fixtures/deck-en.pdf`, plus decks at and just over the page and size limits D2 sets |
| D3 | `src/lib/schema.ts` — `parseGenerateResponse` | Nothing. Pure validator over committed JSON. | `generate-ok.json`, `generate-too-few-topics.json`, `generate-too-many-topics.json`, `generate-empty-title.json` |
| D4 | `src/lib/schema.ts` — same validator | Nothing. | `generate-two-questions.json`, `generate-no-question.json`, `generate-question-unknown-topic.json` |
| D6 | `src/lib/schema.ts` — `parseEvaluateResponse` | Nothing. | `evaluate-ok.json`, `evaluate-score-out-of-range.json`, `evaluate-topic-mismatch.json`, `evaluate-empty-justification.json` |
| D8 | — | **No automated test.** Click count is counted by hand and recorded in the turn log, as D8 itself specifies. A test would assert the click count of a UI it also defined. | — |
| D9 | `src/lib/schema.ts`, `src/hooks/use-cycle.ts` | The adapter. | `deck-he.pdf` and `generate-ok-he.json` |
| N1 | `scripts/check-secrets.mjs` | — | **Implemented.** Proven against three planted failures. |
| N2 | `api/_lib/call-model.ts` — call counter | The adapter, counting invocations. | Any valid response fixture |
| N5 | `api/_lib/call-model.ts` | Adapter returning unparseable text, then valid; and unparseable twice. | `malformed-prose.txt`, `malformed-truncated.json` |
| N6 | `api/_lib/call-model.ts` | Adapter that never resolves, with fake timers. | — |
| N7 | CI | — | **Implemented.** |
| N8 | `scripts/check-pins.mjs` | — | **Implemented.** Proven against a planted alias. |
| N9 | `api/_lib/call-model.ts` — request builder | `fetch`, capturing the outgoing `Request`. | — |
| N11 | `src/lib/cycle-counter.ts` | `localStorage` (an in-memory double) and the clock. | Hand-written corrupt values — see §3.5 |

**D9 is weaker than it looks, and the weakness is structural.** With the adapter
stubbed, a Hebrew fixture response proves only that the pipeline does not mangle
Hebrew on the way through — it cannot prove the model answers in the source
language, because the stub returns whatever we wrote. Whether the model actually
complies is checked by hand once, against a real deck, and the result recorded
in the spiral log. Any test claiming more than that would be theatre.

---

## 3. Architectural guidance and contracts

### 3.1 Module boundaries

Extends `CLAUDE.md` §3 rather than restating it. Modules this turn adds:

| Module | Layer | Responsibility |
| --- | --- | --- |
| `src/lib/contracts.ts` | pure | Shared types for both calls, and the bound constants, each commented with the criterion id that owns it. The only place a DoD figure appears in code. |
| `src/lib/pdf-text.ts` | pure | `ArrayBuffer` → extracted text plus page count. No network. Rejects a deck outside D2's limits before any work. |
| `src/lib/schema.ts` | pure | Deterministic validation of both model responses. Never imports the adapter. |
| `src/lib/cycle-counter.ts` | pure | The N11 counter. Takes the storage object and the clock as arguments, so tests need no globals. |
| `src/hooks/use-cycle.ts` | state | Orchestrates: extract → call 1 → answer → call 2. Holds no business rules. |
| `src/components/` | presentational | Upload, question, verdict, and the named limit and failure states. No fetching in a component body. |
| `api/generate.ts` | serverless | Endpoint for call 1. |
| `api/evaluate.ts` | serverless | Endpoint for call 2. |
| `api/_lib/call-model.ts` | serverless | The single adapter. Underscore prefix so Vercel does not route it as an endpoint. |

The client never holds the provider key and never calls the provider. It calls
its own two endpoints. `src/lib/contracts.ts` is imported by both sides; the
existing `tsconfig.json` already covers `src` and `api`, so one type definition
serves both.

### 3.2 Call 1 — extraction and question

**Request** (browser → `POST /api/generate`):

| Field | Type | Bound |
| --- | --- | --- |
| `text` | `string` | Non-empty after trim. Length ceiling *owned here*: `MAX_CORPUS_CHARS`, set so a deck at D2's page limit stays inside the model's input window. |

**Response** (validated before it leaves `api/generate.ts`):

| Field | Type | Bound |
| --- | --- | --- |
| `topics` | `Topic[]` | Count bounded by **D3**. |
| `topics[].id` | `string` | Matches `/^t[0-9]+$/`. Unique within the array. *Owned here.* |
| `topics[].title` | `string` | Non-empty after trim; ceiling `MAX_TITLE_CHARS`, *owned here*. |
| `topics[].page` | `integer` | `>= 1` and `<= pageCount` of the deck the text came from — the source reference **D3** requires. |
| `question` | `Question` | Exactly the count **D4** fixes. Singular field, not an array, so the shape itself carries the constraint. |
| `question.topicId` | `string` | Must equal one of `topics[].id`. |
| `question.prompt` | `string` | Non-empty after trim; ceiling `MAX_PROMPT_CHARS`, *owned here*. |

The cross-field invariant — `question.topicId` present in `topics` — is checked
by `schema.ts`, not assumed. A model that invents a topic id produces a
structurally valid object that is semantically wrong, and that is precisely the
class deterministic validation exists to catch.

### 3.3 Call 2 — evaluation

**Request** (browser → `POST /api/evaluate`):

| Field | Type | Bound |
| --- | --- | --- |
| `question` | `string` | Non-empty. The prompt as shown to the student. |
| `topicId` | `string` | Same pattern as above. |
| `answer` | `string` | May be empty — an empty answer is a real case, and is graded, not rejected. Ceiling `MAX_ANSWER_CHARS`, *owned here*. |

**Response** (validated before it leaves `api/evaluate.ts`):

| Field | Type | Bound |
| --- | --- | --- |
| `score` | `number` | Range as **D6** defines. Finite; `NaN` and infinities rejected. |
| `topicId` | `string` | Must equal the request's `topicId`. Compared server-side, never trusted from the model. |
| `justification` | `string` | Non-empty after trim; the single-sentence form **D6** requires, enforced as a character ceiling `MAX_JUSTIFICATION_CHARS` plus a terminal-punctuation check. *Ceiling owned here.* |

`justification` is shown to the student — **D6** requires displaying it, not only
storing it. Since nothing is stored at all after the backend cut, "stored only"
is now impossible by construction, but the display requirement stands on its own:
a verdict without a reason is the opaque failure `CLAUDE.md` §3 forbids.

### 3.4 Prompt strategy

Both calls use the same shape: a fixed system instruction, a user message
carrying only data, and a demanded response format.

**What the system instruction fixes** — identical in structure for both calls:

1. The role and the single task. No conversational latitude.
2. **Output language follows the source language**, which is how **D9** is met at
   the prompt level rather than by post-processing.
3. The exact output schema, rendered from `src/lib/contracts.ts` so the bounds in
   the prompt and the bounds in the validator come from one definition. This is
   the one place a DoD figure must reach the model as a literal number, and it
   reaches it by interpolation from the constant that cites the criterion — not
   by a number typed into a prompt string.
4. A prohibition on prose, preamble, apology and markdown fencing.

**How the output shape is demanded.** The request sets the provider's
`responseMimeType` to `application/json` and supplies a response schema, so the
model is constrained at the API level rather than asked politely. The system
instruction repeats the schema because the two mechanisms fail differently and
the redundancy is cheap.

**A response that arrives with prose around the JSON.** Exactly one deterministic
normalisation is permitted: strip a single wrapping markdown code fence. Nothing
else. If the result does not parse, or parses but fails the schema, the response
is **malformed**, and the retry that **N5** allows applies. There is deliberately
no attempt to locate a JSON object inside arbitrary prose — that is guessing
which object the model meant, and a guess that succeeds four times in five is
worse than a visible failure, because it teaches the reader to trust it.

Fence-stripping is normalisation, not repair: it removes a wrapper without
altering, completing or inventing content. Anything that changes what the model
said is a repair loop and is forbidden by `CLAUDE.md` §4.4.

### 3.5 The adapter contract

One `callModel` in `api/_lib/call-model.ts`. All provider traffic goes through
it, so the provider can be swapped in one file.

```
type ModelFailure =
  | { kind: 'timeout' }
  | { kind: 'malformed'; detail: string }
  | { kind: 'transport'; status: number }
  | { kind: 'refused'; status: number };

type ModelResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ModelFailure };

callModel<T>(input: {
  systemInstruction: string;
  userText: string;
  parse: (raw: unknown) => Result<T>;   // from src/lib/schema.ts
}): Promise<ModelResult<T>>;
```

- **Key.** Read from `GEMINI_API_KEY` server-side, sent in the `x-goog-api-key`
  header. The `?key=` query form appears nowhere — **N9**.
- **Model id.** The explicit pinned version **N8** names. Not repeated here, and
  never a moving alias.
- **Validation.** Deterministic, by the `parse` function the caller supplies.
  The adapter never inspects meaning and never asks a model to check a model.
- **Retry.** As **N5** specifies, and only for `timeout` and `malformed`. A
  `refused` or a 4xx is not retried: repeating a request the provider has
  already rejected on its merits burns budget that **N2** accounts for and
  cannot succeed.
- **Timeout.** *Owned here:* `REQUEST_TIMEOUT_MS` per attempt and
  `TOTAL_BUDGET_MS` across the attempt and its retry, enforced with `AbortSignal`
  so a hung socket cannot outlive the request. **N6** requires the bound; this
  document sets it.
- **Result shape.** `{ ok: true, data } | { ok: false, error }` crossing the
  boundary, per `CLAUDE.md` §3. The adapter throws nothing.
- **Leakage.** The key is never logged and never included in any error. A
  provider response body never reaches the client verbatim — the endpoint maps
  `ModelFailure` to a typed, named state. `check:secrets` covers the repository
  and the bundle; it cannot see a runtime log line, so this is a rule the
  adapter enforces by construction.

Call accounting for **N2** lives in the adapter, because it is the only place
every call must pass through. A counter anywhere else could be bypassed by a
second code path, and the criterion says enforced in code, not by convention.

### 3.6 The N11 counter

`src/lib/cycle-counter.ts`. Takes the storage object and a clock function as
arguments; the browser passes `window.localStorage` and `Date.now`, tests pass
doubles. No globals reached from inside.

- **Where.** `localStorage`, under the key `csb.cycles.v1` (*owned here*). The
  version suffix means a future shape change discards old data instead of
  misreading it.
- **What it stores.** `{ "v": 1, "ts": number[] }` — epoch-millisecond timestamps
  of completed cycles. Timestamps rather than a bare count, because **N11**
  specifies a rolling window, and a count cannot expire.
- **How it decides.** Drop timestamps older than the window **N11** defines,
  compare what remains against the limit **N11** sets, write back the pruned
  array. Both figures come from `contracts.ts`.

**The stored value is untrusted input.** It is user-writable by construction —
the browser devtools are one keystroke away — so it is parsed as hostile data,
not as our own serialisation:

| Condition | Treatment |
| --- | --- |
| Key absent | Empty history. Normal first visit. |
| Not valid JSON, or not the expected object shape | Reset to empty, allow the cycle. |
| `v` unrecognised | Reset to empty, allow. |
| `ts` not an array | Reset to empty, allow. |
| An element not a finite number | Drop that element, keep the rest. |
| A timestamp in the future | Drop it. Clock skew and hand-editing are indistinguishable, and a future timestamp would otherwise pin the window open. |
| `ts` longer than a sane ceiling | Truncate to the newest entries. Prevents unbounded growth from a hand-written array. |
| `localStorage` throws — private mode, storage disabled, quota | Treat as empty and allow. Never let a storage failure block the product. |

**Every corrupt case fails open, and that is deliberate.** Failing closed would
be security theatre here: **N11** already states the counter is trivially
bypassed by clearing storage or opening a private window, so a hostile user has
a cheaper route than corrupting the value. Failing closed would therefore stop
nobody while bricking an honest user whose storage was mangled by an unrelated
extension. The control protects against accident, and an accident is best served
by a counter that resets rather than one that locks.

---

## 4. Validation approach

**No test calls the live API. Ever.** Tests are deterministic and offline, the
adapter is stubbed at its own boundary, and `fetch` is replaced where the request
builder itself is under test. A test that reaches the network is not a test of
this system; it is a test of the provider, and it spends the quota **N11** and
the free tier bound.

**Stubbed:** every model interaction. The stub is the seam — it returns fixture
JSON, malformed text, or never resolves, which is how N2, N5, N6 and N9 are
exercised without a provider.

**Requires a real call, done by hand, recorded in the spiral log:**

- Whether the model actually answers in the source language (**D9** — see the
  caveat in §2).
- Whether the model pinned by **N8** grades a free-text answer well enough at all.
  That is **O5** in `framing.md` §6, and it is Turn 2's planned observation with
  its decision rule set in advance.
- One end-to-end cycle against a real deck, to confirm the contracts survive
  contact with a real response.

**Checked by hand:** the click count **D8** fixes, recorded in the turn log.

**Fixtures, all committed, all offline:**

| Fixture | Purpose |
| --- | --- |
| `deck-en.pdf` | Ordinary text-layer deck |
| `deck-he.pdf` | Hebrew source — **D9** |
| `deck-no-text.pdf` | Scanned pages, no text layer |
| `deck-at-page-limit.pdf`, `deck-over-page-limit.pdf` | The boundary D2 sets, on both sides |
| `generate-ok.json`, `generate-ok-he.json` | Valid call 1 responses |
| `generate-too-few-topics.json`, `generate-too-many-topics.json` | D3 bounds |
| `generate-two-questions.json`, `generate-no-question.json` | D4 |
| `generate-question-unknown-topic.json` | Cross-field invariant |
| `evaluate-ok.json` | Valid call 2 response |
| `evaluate-score-out-of-range.json`, `evaluate-topic-mismatch.json`, `evaluate-empty-justification.json` | D6 |
| `malformed-prose.txt`, `malformed-truncated.json`, `semantically-empty.json` | N5 and §5 |

A fixture PDF is committed as a binary. `check:secrets` reads every tracked file
as text; a PDF produces no match for either key format, but this is stated here
because it is the kind of thing that surprises someone later.

---

## 5. Known pitfalls and edge cases

Each of these is a test, not a note.

1. **A PDF with no text layer.** Extraction returns empty. The app says the deck
   has no readable text and what to do about it. It must not proceed to a model
   call with an empty corpus — that spends budget to receive nonsense.
2. **A scanned PDF.** Indistinguishable from the above at the extraction
   boundary, and OCR is out of scope by `framing.md` §4. Same named state.
3. **A deck at exactly the page limit D2 sets.** Must be accepted. Off-by-one
   here rejects a legitimate deck and looks like a bug in the upload.
4. **A deck one page over.** Must be refused, before extraction and before any
   call, with a message naming the limit.
5. **Valid JSON that is semantically empty** — a well-formed object with an empty
   topics array, or a question whose prompt is whitespace. Schema-valid by
   structure, useless in fact. The bounds in §3.2 make it a schema failure, which
   is the point of expressing bounds in the validator rather than trusting shape
   alone.
6. **Prose wrapped around the JSON.** One fence-strip, then parse; failure is
   malformed and takes the **N5** path. No extraction from arbitrary prose.
7. **A timeout.** Bounded by §3.5, surfaced as a named state — **N6**. The
   student is told the model did not answer in time, not shown a spinner that
   never ends. *(Lufthansa 2904: the specification that described only the
   normal landing.)*
8. **A corrupted or hand-edited counter value.** Every case in §3.6, all failing
   open, all tested against hand-written hostile values.
9. **A confidently-wrong answer graded as correct.** The one that matters. A
   fluent, assured, wrong answer scored highly makes the product actively
   dishonest — worse than useless, because the student is told they understand
   something they do not. It is invisible to every happy-path test, since a
   correct answer and a confident wrong one look identical to the schema. This
   is **O5**, it is Turn 2's planned observation, and Turn 2 sets its decision
   rule in advance so the result cannot be rationalised after the fact. **There
   is no way to test it offline**, because the stub returns the score we wrote.

---

## 6. Against Knuth's five criteria

Assessed honestly. A natural-language specification cannot reach the formal
standard, and nothing below claims it does.

**Finiteness.** The cycle terminates by construction: a bounded number of model
calls per **N2**, at most the retry **N5** allows, and a wall-clock bound
per attempt and in total from §3.5. There is no loop whose exit depends on model
output — the one place a cognified system usually loses termination. *Where it
falls short:* termination is argued from the bounds, not proved. Nothing
mechanically checks that a future code path cannot call the adapter from inside a
retry.

**Definiteness.** Each step has one meaning: the JSON contracts fix field names,
types and bounds; the adapter has one entry point; the model id is pinned by
**N8** and the pin is enforced by `check:pins`. *Where it falls short:* the
prompts are English (and Hebrew) instructions to a probabilistic system. Nothing
about a prompt is definite in Knuth's sense. The honest claim is narrower — the
*handling* of the model's output is definite, because every response passes a
deterministic validator before it means anything. Definiteness is recovered at
the boundary, not achieved at the call.

**Input.** Precisely specified: a PDF within D2's limits, and a free-text answer
which may be empty. Both are validated before use, and the counter's stored value
is treated as a third input — hostile, per §3.6. *Where it falls short:* the
*content* of a deck is unconstrained. "A lecture deck" is not a formal input
class, and a deck of holiday photographs with captions satisfies every check.

**Output.** Fully specified in shape: topics with source references and one
question, then a score with its topic and the justification **D6** requires, each
validated against §3.2 and §3.3 before display. *Where it falls short:* shape is
not quality. Nothing in this document can specify that a question is *good* or a
grade *correct*. That gap is the whole of **O5**, and it is deliberately left
open to be measured in Turn 2 rather than asserted here.

**Effectiveness.** Every deterministic step is basic enough to be carried out
exactly: parsing, validating, comparing, arithmetic over timestamps. *Where it
falls short:* the three steps the boundary table in `framing.md` §5 assigns to
the model are the opposite of effective in Knuth's sense — not basic, not
guaranteed, not reproducible between runs at temperature above zero. This is the
central admission of the whole project. A cognified system trades effectiveness
at the step for capability at the task, and the compensation is that every
ineffective step is wrapped in an effective one: validate, bound, retry as **N5**
allows, fail visibly.
