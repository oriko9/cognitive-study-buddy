# Problem Framing — Cognitive Study Buddy

> Module 6 deliverable. This document defines the **problem**, not the solution.
> It is the contract every spiral turn is measured against. Changing it requires a
> commit that states what changed and why.

- **Status:** Locked for Spiral Turn 1
- **Owner:** Ori
- **Course:** LLM-Augmented Software Practice (vibe coding), HIT — Mikael Gorsky

---

## 1. Problem Statement

A student reads course material — lecture slides, handouts — and finishes with a
feeling of comprehension. That feeling is not evidence. Nothing in the current
workflow distinguishes "I recognise this slide" from "I can reconstruct this idea
under exam conditions." The gap between the two is invisible until the exam, at
which point it is too late to act on.

The student therefore allocates study time by intuition rather than by evidence,
and intuition is systematically biased toward material that is already familiar —
the material that feels comfortable to re-read. Weak areas stay weak precisely
because they are unpleasant to revisit, and nothing in the loop forces them to
the surface.

Generic chat assistants do not close this gap. A student can paste slides into a
chatbot and ask for questions, but the result is ephemeral: it is not anchored to
the student's own corpus, it is not scored, it accumulates no history, and it
produces no ranked account of where that specific student is weak. Each session
starts from zero. There is no measurement, so there is no signal to study by.

**The problem this project addresses: a student has no mechanism that converts
their own course material into evidence about what they have not yet understood.**

---

## 2. Stakeholders

| Stakeholder | Relationship | What they need from the system |
| --- | --- | --- |
| **The student (primary user)** | Uploads material, answers questions, reads the weakness map | Honest, specific feedback fast enough to act on in one sitting |
| **Other users of the same deployment** | Each browser session is a distinct anonymous user with its own private corpus | Strict data isolation — one student must never read another's material or results |
| **Course instructor (M. Gorsky)** | Evaluates the repository, not the running app | A legible intent-to-implementation trail: specs before code, atomic commits, real verification gates |
| **The LLM provider (Google Gemini)** | Runtime dependency, free tier | Bounded call volume; the app must degrade honestly when quota is exhausted, not loop |
| **The developer (Ori)** | Builds and defends the project | A scope small enough to finish cleanly across three spiral turns |

**Affected but not users:** course lecturers whose slide decks are uploaded. The
system stores their material on behalf of a student. Corpus files are private to
the uploading student and are never shared or used for training.

---

## 3. Definition of Done — Spiral Turn 1

Every criterion is countable or mechanically checkable. A criterion with no
corresponding automated check is not part of the DoD.

**Numbering gaps are intentional.** D1, D5, D7, N3, N4 and N10 were withdrawn as
scope was cut; the survivors are not renumbered. A criterion id is a reference
used in commit messages, in `specs/course-requirements.md` and in the spiral
log, and renumbering would silently invalidate every citation already written.
A gap means a criterion was withdrawn — the reason is in §4.

### Functional

| # | Criterion | How it is verified |
| --- | --- | --- |
| D2 | The student selects a PDF of **≤ 30 pages / ≤ 10 MB** and its text is extracted **in the browser**. Nothing is uploaded, transmitted, or persisted anywhere. | Unit test on the extraction module against a committed fixture PDF |
| D3 | Topic extraction returns **between 5 and 15 topics**. Each topic has a non-empty title and at least one source reference (page number) into the source PDF. | Schema assertion + count assertion |
| D4 | The app produces **exactly one open-ended question** targeting one extracted topic, carrying that `topic_id`. | Schema assertion on the parsed response |
| D6 | The open answer is evaluated by the model and returns structured JSON: a score in `0..1`, the topic id, and a one-sentence justification. The one-sentence justification is displayed to the student, not stored only. | Schema assertion |
| D8 | From first load, select → question → graded verdict completes in **≤ 3 clicks**, excluding typing. | Manual click-count, recorded in the turn log |
| D9 | Source material in **Hebrew** produces topics and a question in Hebrew. | Fixture test with a Hebrew deck |

### Non-functional

| # | Criterion | How it is verified |
| --- | --- | --- |
| N1 | The Gemini API key exists **only** as a server-side Vercel environment variable (`GEMINI_API_KEY`, no `VITE_` prefix). No key, and no direct provider call, appears in any client bundle. | `npm run check:secrets` scans **two surfaces**: the built output in `dist/`, for **both** key formats — legacy `AIza` and current `AQ.` — plus the literal `GEMINI_API_KEY`, since the variable name alone in a bundle means Vite inlined it; and **every git-tracked file**, for both key formats plus `GEMINI_API_KEY` assigned a non-empty value, since the name appears legitimately in source and specs but an assigned value never should. No allowlist. Fails on a match in either surface |
| N2 | One full cycle costs **exactly one model call on the success path, and at most two** when the retry N5 permits fires. No third call under any condition, and the retry is the only permitted second call. That call receives the extracted text and returns the topics plus one open question; evaluating the student answer is a second cycle under the same budget. Enforced in code, not by convention. | Counter assertion in the test, on both the success path and the retry path |
| N5 | Malformed model JSON triggers **exactly one** retry; a second failure surfaces a visible, typed error. The app never renders invented content on a failed call. *(Norman's Gulf of Evaluation: failure must look like failure, never a blank or default verdict.)* | Test with a stubbed adapter returning garbage |
| N6 | A model timeout is bounded and surfaces as a typed error. *(Lufthansa 2904: a specification written only for the normal case fails in the storm. The abnormal path is specified, not assumed.)* | Test with a stubbed adapter that hangs |
| N7 | `npm run verify` passes: typecheck, lint, and the full test suite. | CI on every push |
| N8 | The model is pinned to the explicit version `models/gemini-3.1-flash-lite`. No moving alias (`-latest`) appears anywhere in the codebase. | Grep gate in CI; fails on `-latest` |
| N9 | The provider key is sent in the `x-goog-api-key` **header**. The `?key=` query-parameter form appears nowhere. | Unit test on the adapter's request builder |
| N11 | A **client-side** rate limit: a per-browser counter in `localStorage` refuses a new cycle after **10 in a rolling 24 hours**, rendered as a named "daily limit reached" state — never a blank screen or a generic error. What it protects: an ordinary user from spending the shared free-tier quota by accident, in the case that actually happens. What it does not protect: anything, against anyone who clears site data or opens a private window, either of which resets the counter in one action and costs nothing. There is no server to enforce it on and no identity to enforce it against, so this is a courtesy to the honest user, not a control. The real ceiling is the provider's own free-tier quota, and this criterion does not raise it. | Unit test on the counter module |

### Turn 1 is done when

Every criterion in §3 — functional and non-functional — passes in CI on `main`, the app is deployed to Vercel, and
the turn is recorded in `specs/spiral-log.md` with the commit range it covers.

---

## 4. Out of Scope

Named explicitly to protect the token budget and the schedule. Anything here that
becomes desirable is deferred to a later turn by a commit that amends this file —
never by quietly building it.

**Deferred to later turns**

- Staged personal study plan (Turn 2)
- Explanation of weak topics through simple worked examples (Turn 3)
- Progress history and trend across multiple quiz sessions (Turn 2)

**Not built in this project at all**

- OCR of scanned or photographed material — text-layer PDFs and PPTX only
- Any mobile application; the deployment is a responsive web app
- Sharing material or results between students; collaboration; classroom or instructor dashboards
- Spaced-repetition scheduling and notifications
- Corpora larger than 30 pages, and multi-file corpora in a single quiz
- Video or audio input
- Payment, subscription, or per-user billing
- User accounts or identity of any kind: email/password, OAuth or social sign-in, password recovery, cross-device continuity, and anonymous sessions. The system has no notion of who is using it.
- Any backend database, server-side persistence, or file storage of any kind
- Multiple-choice questions and deterministic answer scoring
- A ranked weakness map across topics
- PPTX input; PDF with a text layer only
- English-language source material
- Internationalisation of the UI beyond a single chosen interface language

**Accepted cost of removing the backend.** Nothing survives a page reload: the
selected deck, the extracted text, the question and the verdict live only in the
open tab. There is no server-side enforcement of any limit, because there is no
server holding state — N11 bounds ordinary use in the browser and nothing more.
Both costs were accepted knowingly; neither is a defect to be fixed later.

---

## 5. Cognified / Deterministic Boundary

The model is a runtime component, invoked only where human-like reasoning is
strictly required. Everything else is ordinary TypeScript. Any proposal to move a
row upward across this line must be justified in a commit message.

| Concern | Where it runs | Why |
| --- | --- | --- |
| Extracting topics from source text | **LLM** | Requires judgment about what constitutes a distinct idea |
| Writing questions that probe a topic | **LLM** | Requires pedagogical judgment |
| Grading a free-text answer | **LLM** | The only genuinely irreducible case: meaning, not string matching |
| Scoring multiple-choice answers | Deterministic | Comparison against a stored key |
| Ranking topics into a weakness map | Deterministic | Arithmetic over stored scores |
| Validating model output against a schema | Deterministic | Never ask a model to check a model |
| Quota accounting and the cycle counter | Deterministic, **in the client** | Arithmetic over a stored count. Cheap, and honest about being unenforceable — see N11 |
| File parsing (PDF → text) | Deterministic, in the browser | Libraries do this correctly and for free |

---

## 6. Open Decisions

Tracked here until resolved; each resolution lands as its own commit.

| # | Decision | Status |
| --- | --- | --- |
| O1 | Interface language of the app (Hebrew, English, or both) | **Open** |
| O2 | Model id and free-tier quota | **Resolved 2026-08-31.** `models/gemini-3.1-flash-lite` — 15 RPM, 250K TPM, **500 RPD**. Chosen over `gemini-3.5-flash`, whose 20 RPD allows roughly two cycles per day for the entire deployment. Measured in the account's own AI Studio dashboard, not assumed. |
| O3 | Whether topic extraction chunks large decks | **Resolved provisionally.** No chunking in Turn 1: the 30-page cap (D2) keeps a deck inside the 250K TPM window. Revisit if a real deck exceeds it — that observation would itself open a spiral turn. |
| O4 | Weakness score formula: raw proportion correct, or weighted by question type | **Open** — resolve in `specs/specification.md` |
| O5 | Whether `gemini-3.1-flash-lite` grades free-text answers reliably enough | **Resolved 2026-09-08.** Five hand-labelled Hebrew answers (`src/fixtures/o5-answers-he.md`) run by hand through the live deploy on one real question: correct scored 1.0, partial 0.7, and the confidently-wrong, off-topic and empty cases all scored 0. The key case — an answer reusing the correct answer's own formula but drawing the opposite false conclusion — scored 0, evidence the model grades meaning rather than pattern-matching formula presence. The decision rule set in advance (`specs/spiral-log.md` Turn 2) escalates to a stronger model only if a wrong answer scores above 0.5 more than once; zero did, so the rule resolves to no escalation. `models/gemini-3.1-flash-lite` stays, per-user cap unchanged. **Stated honestly:** this is one question with one answer per label — evidence, not proof — and does not rule out a confidently-wrong answer scoring high on a different topic. |

---

## 7. Traceability

`specs/course-requirements.md` maps every stated course requirement to the file
and commit that satisfies it. Update it in the same commit that satisfies a row —
never in a sweep at the end.

## 8. Non-Goals of This Document

This document does not specify architecture, data model, prompts, or API
contracts. Those belong to `specs/specification.md` (Module 10). If a reader
needs to know *how*, this document has been written incorrectly.
